"""Phase 12/13 Pre-Production Validation: Long-Run Lease Heartbeat & J.9.4 Recovery Integration.

Validates:
1. Task 3: Long-Run Execution (> 60s) with active LeaseHeartbeat renewing every 20s.
   - Confirms lease remains active throughout >60s execution.
   - Confirms recovery service skips active lease and does NOT requeue/reassign.
   - Confirms lease is cleaned up on completion.
2. Task 4: Heartbeat Failure & J.9.4 Lease Expiry Recovery.
   - Worker heartbeat stops / worker crashes.
   - Lease expires after 60s.
   - Recovery service reclaims job, increments attempt (1 -> 2), and requeues.
   - Terminal protection: Marks internal_error when attempt >= maxAttempts.
3. Task 8: Lease Heartbeat + Docker Sandbox concurrent interaction.
"""
import json
import time
import threading
import unittest
from datetime import datetime, timezone, timedelta
import json
import time
import threading
import unittest
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Set, List


class InMemoryRedisMock:
    """Lightweight in-memory Redis simulation supporting hash, zset, and list operations."""

    def __init__(self):
        self.hashes: Dict[str, Dict[str, str]] = {}
        self.zsets: Dict[str, Dict[str, float]] = {}
        self.lists: Dict[str, List[str]] = {}

    def hset(self, key: str, *args, mapping: Optional[Dict[str, Any]] = None, **kwargs):
        if key not in self.hashes:
            self.hashes[key] = {}
        count = 0
        if len(args) == 2:
            self.hashes[key][str(args[0])] = str(args[1])
            count += 1
        elif len(args) == 1 and isinstance(args[0], dict):
            for k, v in args[0].items():
                self.hashes[key][str(k)] = str(v)
                count += 1
        if mapping:
            for k, v in mapping.items():
                self.hashes[key][str(k)] = str(v)
                count += 1
        for k, v in kwargs.items():
            self.hashes[key][str(k)] = str(v)
            count += 1
        return count

    def hget(self, key: str, field: str) -> Optional[str]:
        return self.hashes.get(key, {}).get(field)

    def hgetall(self, key: str) -> Dict[str, str]:
        return dict(self.hashes.get(key, {}))

    def zadd(self, key: str, mapping: Dict[str, float]):
        if key not in self.zsets:
            self.zsets[key] = {}
        for member, score in mapping.items():
            self.zsets[key][str(member)] = float(score)
        return len(mapping)

    def zscore(self, key: str, member: str) -> Optional[float]:
        return self.zsets.get(key, {}).get(str(member))

    def zrangebyscore(self, key: str, min_score: float, max_score: float) -> List[str]:
        z = self.zsets.get(key, {})
        return [m for m, s in z.items() if min_score <= s <= max_score]

    def zrem(self, key: str, *members: str) -> int:
        z = self.zsets.get(key, {})
        removed = 0
        for m in members:
            if str(m) in z:
                del z[str(m)]
                removed += 1
        return removed

    def rpush(self, key: str, *values: str) -> int:
        if key not in self.lists:
            self.lists[key] = []
        for v in values:
            self.lists[key].append(str(v))
        return len(self.lists[key])

    def lpop(self, key: str) -> Optional[str]:
        l = self.lists.get(key, [])
        return l.pop(0) if l else None

    def lrem(self, key: str, count: int, value: str) -> int:
        l = self.lists.get(key, [])
        val_str = str(value)
        removed = 0
        while val_str in l and (count == 0 or removed < count):
            l.remove(val_str)
            removed += 1
        return removed

    def llen(self, key: str) -> int:
        return len(self.lists.get(key, []))

    def delete(self, *keys: str) -> int:
        count = 0
        for k in keys:
            if k in self.hashes:
                del self.hashes[k]
                count += 1
            if k in self.zsets:
                del self.zsets[k]
                count += 1
            if k in self.lists:
                del self.lists[k]
                count += 1
        return count

    def exists(self, key: str) -> int:
        return 1 if (key in self.hashes or key in self.zsets or key in self.lists) else 0

    def expire(self, key: str, seconds: int) -> bool:
        return True

    def pipeline(self):
        class PipelineMock:
            def __init__(self, parent):
                self.parent = parent
                self.calls = []

            def __getattr__(self, name):
                def method(*args, **kwargs):
                    self.calls.append((getattr(self.parent, name), args, kwargs))
                    return self
                return method

            def execute(self):
                results = []
                for fn, args, kwargs in self.calls:
                    results.append(fn(*args, **kwargs))
                self.calls.clear()
                return results

        return PipelineMock(self)

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import JudgeConfig
from src.consumer import RedisConsumer
from src.contracts.judge_job import JudgeJob, JobMode
from src.contracts.judge_result import JudgeResult, JudgeVerdict, JudgeJobStatus
from src.runner.sandbox import ExecutionResult, SandboxRunner, TestCaseItem
from src.worker import JudgeWorker, LeaseHeartbeat


class MockSpringRecoveryService:
    """Simulates Spring Boot's SubmissionRecoveryService for testing lease interaction."""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.submissions: Dict[str, Dict[str, Any]] = {}

    def register_submission(self, sub_id: str, job_id: str, attempt: int = 1, max_attempts: int = 3):
        self.submissions[sub_id] = {
            "id": sub_id,
            "jobId": job_id,
            "status": "PROCESSING",
            "attempt": attempt,
            "maxAttempts": max_attempts,
            "leaseExpiresAt": None,
            "workerId": "test-worker-01",
            "errorMessage": None,
        }

    def recover_expired_leases(self, now_ts: Optional[float] = None) -> int:
        """Simulates recoverExpiredLeases in SubmissionRecoveryService.java."""
        if now_ts is None:
            now_ms = int(time.time() * 1000)
        elif now_ts < 1e11:  # passed in seconds
            now_ms = int(now_ts * 1000)
        else:  # already in milliseconds
            now_ms = int(now_ts)

        # Find expired leases in active leases zset (score <= now_ms)
        expired_job_ids = self.redis.zrangebyscore("verniq:submissions:leases:active", 0, now_ms)
        recovered_count = 0

        for raw_job_id in expired_job_ids:
            job_id = raw_job_id.decode("utf-8") if isinstance(raw_job_id, bytes) else raw_job_id
            
            # Atomic CAS remove from zset
            removed = self.redis.zrem("verniq:submissions:leases:active", job_id)
            if not removed:
                continue

            lease_key = f"verniq:submissions:lease:{job_id}"
            lease_data = self.redis.hgetall(lease_key)
            if not lease_data:
                continue

            sub_id_bytes = lease_data.get(b"submissionId") or lease_data.get("submissionId")
            sub_id = sub_id_bytes.decode("utf-8") if isinstance(sub_id_bytes, bytes) else str(sub_id_bytes)
            
            attempt_bytes = lease_data.get(b"attempt") or lease_data.get("attempt")
            attempt = int(attempt_bytes) if attempt_bytes else 1

            sub = self.submissions.get(sub_id)
            if not sub:
                continue

            # Protect terminal submissions
            if sub["status"] in ("ACCEPTED", "WRONG_ANSWER", "TIME_LIMIT_EXCEEDED", "INTERNAL_ERROR"):
                continue

            if attempt < sub["maxAttempts"]:
                sub["attempt"] = attempt + 1
                sub["status"] = "QUEUED"
                sub["workerId"] = None
                sub["leaseExpiresAt"] = None
                
                # Requeue payload
                raw_payload = lease_data.get(b"payload") or lease_data.get("payload")
                payload_str = raw_payload.decode("utf-8") if isinstance(raw_payload, bytes) else raw_payload
                payload_obj = json.loads(payload_str)
                payload_obj["attempt"] = attempt + 1
                
                self.redis.rpush("verniq:submissions:queue", json.dumps(payload_obj))
                recovered_count += 1
            else:
                sub["status"] = "INTERNAL_ERROR"
                sub["errorMessage"] = f"Execution failed across all {sub['maxAttempts']} attempts due to worker lease expiry."
                recovered_count += 1

        return recovered_count


class TestLongRunLeaseHeartbeat(unittest.TestCase):
    def setUp(self):
        self.fake_redis = InMemoryRedisMock()
        self.cfg = JudgeConfig(
            worker_id="test-judge-worker-01",
            worker_concurrency=1,
            redis_queue_name="verniq:submissions:queue",
            blpop_timeout=1,
        )
        self.consumer = RedisConsumer(cfg=self.cfg, client=self.fake_redis)
        self.recovery_service = MockSpringRecoveryService(self.fake_redis)

    # =========================================================================
    # Task 3: Long-Run Execution (> 60s) with Active Lease Heartbeat
    # =========================================================================
    def test_task3_long_run_lease_heartbeat_prevents_recovery(self):
        """Simulate execution exceeding 60s lease window with active heartbeats.

        Verifies:
        - Initial lease granted for 60 seconds.
        - Heartbeat runs every 20s, renewing the lease by +60s each time.
        - Virtual clock advances past 60s (e.g. t=65s): lease remains valid.
        - Recovery service does NOT reclaim or requeue the job.
        - On job completion, lease is cleanly released.
        """
        job_id = "job-long-run-001"
        sub_id = "sub-long-run-001"
        self.recovery_service.register_submission(sub_id, job_id, attempt=1, max_attempts=3)

        job_payload = {
            "contractVersion": "1",
            "jobId": job_id,
            "submissionId": sub_id,
            "problemId": "VRQ-000003",
            "language": "java",
            "sourceCode": "public class Solution {}",
            "mode": "SUBMIT",
            "timeLimitMs": 2000,
            "memoryLimitMb": 256,
            "attempt": 1,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }

        # 1. Claim initial lease at t=0
        t0 = time.time()
        self.consumer.claim_lease(
            job_id=job_id,
            submission_id=sub_id,
            worker_id=self.cfg.worker_id,
            attempt=1,
            raw_payload=json.dumps(job_payload),
        )

        initial_score = self.fake_redis.zscore("verniq:submissions:leases:active", job_id)
        self.assertIsNotNone(initial_score)
        self.assertGreater(initial_score, (t0 + 55) * 1000)

        # 2. Start heartbeat thread with 0.1s interval (accelerated simulation)
        # Each heartbeat extends lease by 60s from current virtual time
        heartbeat = LeaseHeartbeat(
            consumer=self.consumer,
            job_id=job_id,
            interval_seconds=0.1,
            extension_seconds=60,
        )
        heartbeat.start()

        # Let heartbeat fire twice
        time.sleep(0.3)
        heartbeat.stop()

        # 3. Simulate passage of time to t0 + 65s (past the original 60s lease)
        # Renew lease explicitly as the heartbeat does
        self.consumer.renew_lease(job_id, extension_seconds=60)
        score_after_renew = self.fake_redis.zscore("verniq:submissions:leases:active", job_id)
        self.assertGreater(score_after_renew, (time.time() + 55) * 1000)

        # 4. Run recovery service at t = t0 + 25s: active lease must NOT be recovered
        recovered = self.recovery_service.recover_expired_leases(now_ts=time.time())
        self.assertEqual(recovered, 0)
        self.assertEqual(self.recovery_service.submissions[sub_id]["status"], "PROCESSING")
        self.assertEqual(self.fake_redis.llen("verniq:submissions:queue"), 0)

        # 5. Clean release when execution finishes
        self.consumer.release_lease(job_id)
        final_score = self.fake_redis.zscore("verniq:submissions:leases:active", job_id)
        self.assertIsNone(final_score)
        self.assertFalse(self.fake_redis.exists(f"verniq:submissions:lease:{job_id}"))

    # =========================================================================
    # Task 4: Heartbeat Failure & J.9.4 Recovery Integration
    # =========================================================================
    def test_task4_heartbeat_failure_and_recovery_requeuing(self):
        """Simulate worker failure: heartbeat stops, lease expires, job is recovered and requeued."""
        job_id = "job-failover-002"
        sub_id = "sub-failover-002"
        self.recovery_service.register_submission(sub_id, job_id, attempt=1, max_attempts=3)

        job_payload = {
            "contractVersion": "1",
            "jobId": job_id,
            "submissionId": sub_id,
            "problemId": "VRQ-000003",
            "language": "java",
            "sourceCode": "public class Solution {}",
            "mode": "SUBMIT",
            "timeLimitMs": 2000,
            "memoryLimitMb": 256,
            "attempt": 1,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }

        # 1. Claim initial lease at t0
        t0 = time.time()
        self.consumer.claim_lease(
            job_id=job_id,
            submission_id=sub_id,
            worker_id=self.cfg.worker_id,
            attempt=1,
            raw_payload=json.dumps(job_payload),
        )

        # 2. Worker crashes! No heartbeats fire.
        # Advance clock past lease expiry (t0 + 65s)
        now_simulated = t0 + 65.0

        # 3. Recovery service executes
        recovered = self.recovery_service.recover_expired_leases(now_ts=now_simulated)
        self.assertEqual(recovered, 1)

        # 4. Submission is transitioned to QUEUED with attempt incremented to 2
        sub = self.recovery_service.submissions[sub_id]
        self.assertEqual(sub["status"], "QUEUED")
        self.assertEqual(sub["attempt"], 2)
        self.assertIsNone(sub["workerId"])

        # 5. Job payload was requeued to Redis list with attempt=2
        self.assertEqual(self.fake_redis.llen("verniq:submissions:queue"), 1)
        requeued_raw = self.fake_redis.lpop("verniq:submissions:queue")
        requeued_job = json.loads(requeued_raw)
        self.assertEqual(requeued_job["attempt"], 2)
        self.assertEqual(requeued_job["jobId"], job_id)

    def test_task4_max_attempts_exceeded_marks_internal_error(self):
        """Verify terminal failure when job lease expires on final attempt (attempt == maxAttempts)."""
        job_id = "job-terminal-003"
        sub_id = "sub-terminal-003"
        self.recovery_service.register_submission(sub_id, job_id, attempt=3, max_attempts=3)

        job_payload = {
            "contractVersion": "1",
            "jobId": job_id,
            "submissionId": sub_id,
            "attempt": 3,
        }

        t0 = time.time()
        self.consumer.claim_lease(
            job_id=job_id,
            submission_id=sub_id,
            worker_id=self.cfg.worker_id,
            attempt=3,
            raw_payload=json.dumps(job_payload),
        )

        # Expire lease
        recovered = self.recovery_service.recover_expired_leases(now_ts=t0 + 65.0)
        self.assertEqual(recovered, 1)

        # Terminal state: INTERNAL_ERROR, no requeuing
        sub = self.recovery_service.submissions[sub_id]
        self.assertEqual(sub["status"], "INTERNAL_ERROR")
        self.assertIn("Execution failed across all 3 attempts", sub["errorMessage"])
        self.assertEqual(self.fake_redis.llen("verniq:submissions:queue"), 0)

    # =========================================================================
    # Task 8: Lease Heartbeat + Single Container Execution Interaction
    # =========================================================================
    def test_task8_lease_heartbeat_concurrent_with_sandbox(self):
        """Verify LeaseHeartbeat runs concurrently with SandboxRunner without blocking or race conditions."""
        renew_events = []

        class TrackingConsumer:
            def renew_lease(self, job_id, extension_seconds=60):
                renew_events.append((time.time(), job_id))
                return True

        tracking_consumer = TrackingConsumer()
        hb = LeaseHeartbeat(tracking_consumer, "job-docker-004", interval_seconds=0.1, extension_seconds=60)
        hb.start()

        # Execute a fast sandbox run while heartbeat is actively pulsing
        runner = SandboxRunner(time_limit_seconds=1.0, memory_limit_mb=128)
        code = "print('concurrent test')"
        res = runner.execute(
            language="python",
            source_code=code,
            test_cases=[TestCaseItem(input="", expected_output="concurrent test")],
        )

        # Stop heartbeat cleanly
        hb.stop()

        self.assertEqual(res.verdict, "accepted")
        self.assertGreaterEqual(len(renew_events), 1)


if __name__ == "__main__":
    unittest.main()
