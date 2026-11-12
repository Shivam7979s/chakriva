"""Unit tests for Phase J.9.4 Durable Judge Job Lease and Recovery.

Tests:
1. Lease claim registers lease hash, active lease zset, and processing list
2. Lease renewal updates active zset score and hash field
3. Lease release deletes lease hash, removes from zset, and removes from processing list
4. Worker startup stranded job recovery requeues in-flight jobs
5. JudgeJob deserializes attempt field correctly (default=1, custom values)
6. Worker executes job while claiming and releasing durable lease
"""
import json
import os
import sys
import time
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import redis
from src.config import JudgeConfig
from src.consumer import RedisConsumer
from src.contracts.judge_job import JudgeJob, JobMode
from src.contracts.judge_result import JudgeResult, JudgeVerdict, JudgeJobStatus
from src.runner.sandbox import ExecutionResult, ExecutionTelemetry, SandboxRunner, TestCaseItem
from src.worker import JudgeWorker


def make_test_job(**overrides) -> JudgeJob:
    payload = {
        "contractVersion": "1",
        "jobId": "job-test-lease-01",
        "submissionId": "sub-test-lease-01",
        "problemId": "prob-test-01",
        "problemVerniqId": "VRQ-000001",
        "problemVersion": 1,
        "language": "python",
        "sourceCode": "print('hello')",
        "mode": "SUBMIT",
        "timeLimitMs": 2000,
        "memoryLimitMb": 256,
        "customInput": None,
        "attempt": 1,
        "createdAt": "2026-10-06T05:21:00Z",
    }
    payload.update(overrides)
    return JudgeJob(**payload)


class TestDurableLease(unittest.TestCase):
    def setUp(self):
        self.mock_redis = MagicMock(spec=redis.Redis)
        self.mock_pipe = MagicMock()
        self.mock_redis.pipeline.return_value = self.mock_pipe
        self.cfg = JudgeConfig(
            worker_id="test-judge-worker-01",
            worker_concurrency=1,
            redis_queue_name="verniq:submissions:queue",
            blpop_timeout=2,
        )
        self.consumer = RedisConsumer(cfg=self.cfg, client=self.mock_redis)

    def test_01_judge_job_attempt_field_defaults_and_parsing(self):
        # Default attempt
        job_default = make_test_job()
        self.assertEqual(job_default.attempt, 1)

        # Custom attempt
        job_attempt_2 = make_test_job(attempt=2)
        self.assertEqual(job_attempt_2.attempt, 2)

        # Deserialized from JSON
        raw_json = json.dumps({
            "contractVersion": "1",
            "jobId": "job-custom-attempt",
            "submissionId": "sub-custom-attempt",
            "problemId": "prob-custom",
            "problemVerniqId": "VRQ-000001",
            "problemVersion": 1,
            "language": "python",
            "sourceCode": "print(1)",
            "mode": "SUBMIT",
            "timeLimitMs": 1000,
            "memoryLimitMb": 128,
            "attempt": 3,
            "createdAt": "2026-10-06T05:21:00Z",
        })
        parsed = self.consumer.parse_job(raw_json)
        self.assertEqual(parsed.attempt, 3)

    def test_02_claim_lease_registers_hash_zset_and_processing_queue(self):
        job = make_test_job()
        raw_payload = job.model_dump_json()

        claimed = self.consumer.claim_lease(
            job_id=job.jobId,
            submission_id=job.submissionId,
            worker_id=self.cfg.worker_id,
            attempt=1,
            raw_payload=raw_payload,
            lease_duration_seconds=60,
        )
        self.assertTrue(claimed)

        # Verify Redis calls on pipeline
        expected_lease_key = f"verniq:submissions:lease:{job.jobId}"
        expected_processing_key = f"verniq:submissions:processing:{self.cfg.worker_id}"

        # Hash set
        self.mock_pipe.hset.assert_called_once()
        call_args, call_kwargs = self.mock_pipe.hset.call_args
        self.assertEqual(call_args[0], expected_lease_key)
        self.assertIn("mapping", call_kwargs)
        mapping = call_kwargs["mapping"]
        self.assertEqual(mapping["submissionId"], job.submissionId)
        self.assertEqual(mapping["workerId"], self.cfg.worker_id)
        self.assertEqual(mapping["attempt"], "1")

        # ZADD into active leases
        self.mock_pipe.zadd.assert_called_once()
        zadd_args = self.mock_pipe.zadd.call_args[0]
        self.assertEqual(zadd_args[0], "verniq:submissions:leases:active")
        self.assertIn(job.jobId, zadd_args[1])

        # RPUSH into worker processing list
        self.mock_pipe.rpush.assert_called_once_with(expected_processing_key, raw_payload)
        self.mock_pipe.execute.assert_called()

    def test_03_renew_lease_updates_zset_and_hash(self):
        self.mock_redis.exists.return_value = True
        renewed = self.consumer.renew_lease("job-test-01", extension_seconds=45)
        self.assertTrue(renewed)

        self.mock_pipe.hset.assert_called_once()
        call_args = self.mock_pipe.hset.call_args[0]
        self.assertEqual(call_args[0], "verniq:submissions:lease:job-test-01")
        self.assertEqual(call_args[1], "leaseExpiresAt")
        self.mock_pipe.expire.assert_called_once_with("verniq:submissions:lease:job-test-01", 45 * 3)
        self.mock_pipe.zadd.assert_called_once()
        self.mock_pipe.execute.assert_called()

    def test_04_release_lease_cleans_up_all_tracking_keys(self):
        job = make_test_job()
        raw_payload = job.model_dump_json()

        released = self.consumer.release_lease(job.jobId, raw_payload)
        self.assertTrue(released)

        expected_lease_key = f"verniq:submissions:lease:{job.jobId}"
        expected_processing_key = f"verniq:submissions:processing:{self.cfg.worker_id}"

        self.mock_pipe.delete.assert_called_once_with(expected_lease_key)
        self.mock_pipe.zrem.assert_called_once_with("verniq:submissions:leases:active", job.jobId)
        self.mock_pipe.lrem.assert_called_once_with(expected_processing_key, 1, raw_payload)
        self.mock_pipe.execute.assert_called()

    def test_05_recover_stranded_jobs_on_startup_requeues_and_cleans(self):
        stranded_raw_1 = json.dumps({"jobId": "job-stranded-1", "submissionId": "sub-1", "attempt": 1})
        stranded_raw_2 = json.dumps({"jobId": "job-stranded-2", "submissionId": "sub-2", "attempt": 1})

        expected_processing_key = f"verniq:submissions:processing:{self.cfg.worker_id}"
        self.mock_redis.lrange.return_value = [stranded_raw_1, stranded_raw_2]

        requeued = self.consumer.recover_stranded_jobs_on_startup()
        self.assertEqual(requeued, 2)

        # Verified RPUSH to main queue for both via pipeline
        self.assertEqual(self.mock_pipe.rpush.call_count, 2)
        self.mock_pipe.execute.assert_called()

    def test_06_worker_claims_and_releases_lease_during_successful_execution(self):
        mock_runner = MagicMock(spec=SandboxRunner)
        mock_runner.execute.return_value = ExecutionResult(
            verdict="accepted",
            runtime_ms=30,
            memory_kb=1024,
            test_cases_passed=1,
            total_test_cases=1,
        )

        mock_callback_client = MagicMock()
        mock_callback_client.report_result.return_value = True

        worker = JudgeWorker(
            consumer=self.consumer,
            runner=mock_runner,
            callback_client=mock_callback_client,
            cfg=self.cfg,
        )
        worker.fetch_canonical_test_cases = MagicMock(return_value=[TestCaseItem(input="1", expected_output="1")])

        job = make_test_job()
        raw_payload = job.model_dump_json()
        setattr(job, "_raw_payload", raw_payload)

        worker.execute_job(job)

        # Assert claim_lease was executed on pipeline
        expected_lease_key = f"verniq:submissions:lease:{job.jobId}"
        self.mock_pipe.hset.assert_called()
        self.assertEqual(self.mock_pipe.hset.call_args_list[0][0][0], expected_lease_key)

        # Assert release_lease was executed upon completion (delete called for lease key)
        self.mock_pipe.delete.assert_called_with(expected_lease_key)
        self.mock_pipe.zrem.assert_called_with("verniq:submissions:leases:active", job.jobId)


if __name__ == "__main__":
    unittest.main()
