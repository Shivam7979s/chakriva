"""Unit and integration test suite for Phase J.5.3 Production Judge Worker & Redis Consumer.

Tests all 20 required acceptance criteria from Section 25:
1. Valid JSON job deserializes
2. Valid JudgeJob reaches execution engine
3. contractVersion=1 accepted
4. Unsupported contract version rejected
5. Malformed JSON rejected safely
6. Missing required field rejected
7. Invalid language rejected
8. Invalid mode rejected
9. Blank source rejected
10. Redis BLPOP queue name is correct
11. Worker does not busy-spin
12. Execution result maps to JudgeResult
13. One job exception does not kill worker
14. Redis connection failure handled
15. Graceful shutdown works
16. Worker ID is preserved
17. Hidden test data is not logged
18. Source code is not logged
19. Concurrency default is 1
20. No Supabase pending-submission polling occurs in production worker loop
"""
import io
import json
import logging
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import redis

from src.config import JudgeConfig, config
from src.consumer import RedisConsumer
from src.contracts.judge_job import CONTRACT_VERSION, JobMode, JudgeJob
from src.contracts.judge_result import JudgeJobStatus, JudgeResult, JudgeVerdict
from src.runner.sandbox import ExecutionResult, ExecutionTelemetry, FailedTestCaseInfo, SandboxRunner, TestCaseItem
from src.worker import JudgeWorker


def make_valid_job_payload_dict(**overrides) -> dict:
    base = {
        "contractVersion": "1",
        "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "submissionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "problemId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "problemVerniqId": "VRQ-000001",
        "problemVersion": 1,
        "language": "python",
        "sourceCode": "def twoSum(nums, target): return [0, 1]",
        "mode": "SUBMIT",
        "timeLimitMs": 2000,
        "memoryLimitMb": 256,
        "customInput": None,
        "createdAt": "2026-10-06T05:21:00Z",
    }
    base.update(overrides)
    return base


class TestRedisConsumerAndWorker(unittest.TestCase):
    def setUp(self):
        self.mock_redis = MagicMock(spec=redis.Redis)
        self.cfg = JudgeConfig(
            worker_id="test-judge-worker-1",
            worker_concurrency=1,
            redis_queue_name="verniq:submissions:queue",
            blpop_timeout=2,
            redis_backoff_initial=0.01,
            redis_backoff_max=0.05,
        )
        self.consumer = RedisConsumer(cfg=self.cfg, client=self.mock_redis)

    # 1. Valid JSON job deserializes
    def test_01_valid_json_job_deserializes(self):
        payload_dict = make_valid_job_payload_dict()
        raw_json = json.dumps(payload_dict)
        job = self.consumer.parse_job(raw_json)

        self.assertIsNotNone(job)
        self.assertEqual(job.jobId, payload_dict["jobId"])
        self.assertEqual(job.submissionId, payload_dict["submissionId"])
        self.assertEqual(job.problemId, payload_dict["problemId"])
        self.assertEqual(job.language, "python")
        self.assertEqual(job.mode, JobMode.SUBMIT)
        self.assertEqual(job.timeLimitMs, 2000)
        self.assertEqual(job.memoryLimitMb, 256)

    # 2. Valid JudgeJob reaches execution engine
    def test_02_valid_judge_job_reaches_execution_engine(self):
        mock_runner = MagicMock(spec=SandboxRunner)
        mock_runner.execute.return_value = ExecutionResult(
            verdict="accepted",
            runtime_ms=45,
            memory_kb=1024,
            test_cases_passed=5,
            total_test_cases=5,
        )

        worker = JudgeWorker(consumer=self.consumer, runner=mock_runner)
        payload = make_valid_job_payload_dict(mode="RUN", customInput="[1,2,3]")
        job = JudgeJob.model_validate(payload)

        result = worker.execute_job(job)

        self.assertIsInstance(result, JudgeResult)
        self.assertEqual(result.verdict, JudgeVerdict.ACCEPTED)
        mock_runner.execute.assert_called_once()
        _, kwargs = mock_runner.execute.call_args
        self.assertEqual(kwargs["language"], "python")
        self.assertEqual(kwargs["source_code"], payload["sourceCode"])
        self.assertTrue(kwargs["is_custom_run"])
        self.assertEqual(kwargs["execution_id"], job.jobId)

    # 3. contractVersion=1 accepted
    def test_03_contract_version_1_accepted(self):
        payload = make_valid_job_payload_dict(contractVersion="1")
        job = self.consumer.parse_job(json.dumps(payload))
        self.assertIsNotNone(job)
        self.assertEqual(job.contractVersion, "1")

    # 4. Unsupported contract version rejected
    def test_04_unsupported_contract_version_rejected(self):
        payload = make_valid_job_payload_dict(contractVersion="2")
        job = self.consumer.parse_job(json.dumps(payload))
        self.assertIsNone(job)
        self.assertEqual(self.consumer.jobs_rejected, 1)

    # 5. Malformed JSON rejected safely
    def test_05_malformed_json_rejected_safely(self):
        malformed = '{"contractVersion": "1", "jobId": '
        job = self.consumer.parse_job(malformed)
        self.assertIsNone(job)
        self.assertEqual(self.consumer.jobs_rejected, 1)

    # 6. Missing required field rejected
    def test_06_missing_required_field_rejected(self):
        payload = make_valid_job_payload_dict()
        del payload["jobId"]  # Missing required field
        job = self.consumer.parse_job(json.dumps(payload))
        self.assertIsNone(job)
        self.assertEqual(self.consumer.jobs_rejected, 1)

    # 7. Invalid language rejected
    def test_07_invalid_language_rejected(self):
        payload = make_valid_job_payload_dict(language="unsupported_lang_xyz")
        job = self.consumer.parse_job(json.dumps(payload))
        self.assertIsNone(job)
        self.assertEqual(self.consumer.jobs_rejected, 1)

    # 8. Invalid mode rejected
    def test_08_invalid_mode_rejected(self):
        payload = make_valid_job_payload_dict(mode="BENCHMARK")
        job = self.consumer.parse_job(json.dumps(payload))
        self.assertIsNone(job)
        self.assertEqual(self.consumer.jobs_rejected, 1)

    # 9. Blank source rejected
    def test_09_blank_source_rejected(self):
        payload = make_valid_job_payload_dict(sourceCode="")
        job = self.consumer.parse_job(json.dumps(payload))
        self.assertIsNone(job)
        self.assertEqual(self.consumer.jobs_rejected, 1)

    # 10. Redis BLPOP queue name is correct
    def test_10_redis_blpop_queue_name_is_correct(self):
        payload = json.dumps(make_valid_job_payload_dict())
        self.mock_redis.blpop.return_value = ("verniq:submissions:queue", payload)

        popped = self.consumer.pop_job()
        self.assertIsNotNone(popped)
        self.mock_redis.blpop.assert_called_with("verniq:submissions:queue", timeout=2)

    # 11. Worker does not busy-spin (uses blocking timeout)
    def test_11_worker_does_not_busy_spin(self):
        self.assertGreaterEqual(self.consumer.blpop_timeout, 1)
        self.mock_redis.blpop.return_value = None  # Timeout expired with no jobs

        res = self.consumer.pop_raw_job()
        self.assertIsNone(res)
        # Verifies blpop was called with timeout parameter
        self.mock_redis.blpop.assert_called_once()
        self.assertEqual(self.mock_redis.blpop.call_args[1]["timeout"], 2)

    # 12. Execution result maps to JudgeResult
    def test_12_execution_result_maps_to_judge_result(self):
        mock_runner = MagicMock(spec=SandboxRunner)
        exec_res = ExecutionResult(
            verdict="wrong_answer",
            runtime_ms=120,
            memory_kb=2048,
            test_cases_passed=4,
            total_test_cases=5,
            first_failed_test=FailedTestCaseInfo(
                test_number=5,
                actual_output="[0, 2]",
                expected_output="[0, 1]",
                is_sample=True,
                failure_type="WRONG_ANSWER",
            ),
            telemetry=ExecutionTelemetry(
                execution_id="exec-123",
                request_received_at="2026-10-06T05:00:00Z",
                total_ms=150,
            ),
        )
        mock_runner.execute.return_value = exec_res

        worker = JudgeWorker(consumer=self.consumer, runner=mock_runner)
        job = JudgeJob.model_validate(make_valid_job_payload_dict(mode="RUN"))

        result: JudgeResult = worker.execute_job(job)

        self.assertEqual(result.contractVersion, "1")
        self.assertEqual(result.jobId, job.jobId)
        self.assertEqual(result.submissionId, job.submissionId)
        self.assertEqual(result.workerId, "test-judge-worker-1")
        self.assertEqual(result.verdict, JudgeVerdict.WRONG_ANSWER)
        self.assertEqual(result.status, JudgeJobStatus.COMPLETED)
        self.assertEqual(result.runtimeMs, 120)
        self.assertEqual(result.memoryKb, 2048)
        self.assertEqual(result.testCasesPassed, 4)
        self.assertEqual(result.totalTestCases, 5)
        self.assertIsNotNone(result.firstFailedTest)
        self.assertEqual(result.firstFailedTest.testNumber, 5)
        self.assertEqual(result.firstFailedTest.actualOutput, "[0, 2]")
        self.assertEqual(result.firstFailedTest.expectedOutput, "[0, 1]")
        self.assertIsNotNone(result.telemetry)
        self.assertEqual(result.telemetry.totalMs, 150)

    # 13. One job exception does not kill worker
    def test_13_one_job_exception_does_not_kill_worker(self):
        mock_runner = MagicMock(spec=SandboxRunner)
        mock_runner.execute.side_effect = RuntimeError("Fatal hardware failure emulation")

        worker = JudgeWorker(consumer=self.consumer, runner=mock_runner)
        job = JudgeJob.model_validate(make_valid_job_payload_dict(mode="RUN"))

        result = worker.execute_job(job)

        self.assertIsNotNone(result)
        self.assertEqual(result.status, JudgeJobStatus.INTERNAL_ERROR)
        self.assertEqual(result.verdict, JudgeVerdict.INTERNAL_ERROR)
        self.assertEqual(worker.job_failures, 1)
        self.assertEqual(worker.state, "WAITING_FOR_JOB")  # Worker ready for next job

    # 14. Redis connection failure handled with backoff
    def test_14_redis_connection_failure_handled(self):
        self.mock_redis.blpop.side_effect = redis.ConnectionError("Redis connection refused")
        self.mock_redis.ping.side_effect = redis.ConnectionError("Redis ping refused")

        popped = self.consumer.pop_raw_job()
        self.assertIsNone(popped)
        self.assertEqual(self.consumer.redis_errors, 1)
        self.assertGreater(self.consumer.current_backoff, self.consumer.backoff_initial)

    # 15. Graceful shutdown works
    def test_15_graceful_shutdown_works(self):
        worker = JudgeWorker(consumer=self.consumer)
        self.assertEqual(worker.state, "READY")

        worker.stop()
        self.assertFalse(worker.running)
        self.assertEqual(worker.state, "STOPPED")
        self.mock_redis.close.assert_called_once()

    # 16. Worker ID is preserved
    def test_16_worker_id_is_preserved(self):
        custom_cfg = JudgeConfig(worker_id="aws-prod-judge-node-77")
        worker = JudgeWorker(consumer=RedisConsumer(cfg=custom_cfg, client=self.mock_redis))
        self.assertEqual(worker.worker_id, "aws-prod-judge-node-77")

        health = worker.get_health_status()
        self.assertEqual(health["worker"], "aws-prod-judge-node-77")

    # 17. Hidden test data is not logged or leaked
    def test_17_hidden_test_data_is_not_logged(self):
        mock_runner = MagicMock(spec=SandboxRunner)
        # Non-sample (hidden) test failure
        exec_res = ExecutionResult(
            verdict="wrong_answer",
            runtime_ms=50,
            test_cases_passed=9,
            total_test_cases=10,
            first_failed_test=FailedTestCaseInfo(
                test_number=10,
                actual_output="computed_hash",
                expected_output="SECRET_CANONICAL_HASH",
                is_sample=False,  # Canonical hidden test!
            ),
        )
        mock_runner.execute.return_value = exec_res

        worker = JudgeWorker(consumer=self.consumer, runner=mock_runner)
        job = JudgeJob.model_validate(make_valid_job_payload_dict(mode="SUBMIT"))

        result = worker.execute_job(job)

        self.assertIsNotNone(result.firstFailedTest)
        self.assertFalse(result.firstFailedTest.isSample)
        # Security invariant: expectedOutput is strictly None for hidden tests
        self.assertIsNone(result.firstFailedTest.expectedOutput)

    # 18. Source code is not logged
    def test_18_source_code_is_not_logged(self):
        secret_source = "def proprietarySecretCode(): return 42"
        job = JudgeJob.model_validate(make_valid_job_payload_dict(sourceCode=secret_source))

        repr_str = repr(job)
        str_str = str(job)

        self.assertNotIn(secret_source, repr_str)
        self.assertNotIn(secret_source, str_str)
        self.assertIn("<REDACTED len=", repr_str)

    # 19. Concurrency default is 1
    def test_19_concurrency_default_is_1(self):
        default_cfg = JudgeConfig()
        self.assertEqual(default_cfg.worker_concurrency, 1)

    # 20. No Supabase pending-submission polling in production worker loop
    def test_20_no_supabase_pending_submission_polling_in_production_loop(self):
        worker = JudgeWorker(consumer=self.consumer)
        # Verify worker does not have any claim_next_submission in its production loop
        # We simulate one iteration of run() when pop_job returns None and then stop
        with patch.object(self.consumer, "pop_job", return_value=None) as mock_pop:
            def stop_loop():
                worker.running = False
                return None
            mock_pop.side_effect = stop_loop

            worker.run()

            # Verify only consumer.pop_job was consulted
            mock_pop.assert_called_once()
            # Verify worker does NOT have claim_next_submission method being called
            self.assertFalse(hasattr(worker, "claim_next_submission"))


if __name__ == "__main__":
    unittest.main()
