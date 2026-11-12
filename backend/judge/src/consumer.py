"""Production Redis Job Consumer for CHAKRIVA Online Judge (Phase J.5.3).

Consumes validated JudgeJob items from Redis via blocking BLPOP transport.
Strictly adheres to:
  - Canonical contract: JudgeJob (Version 1)
  - Zero-trust: No secrets, no source code logging, no hidden test exposure.
  - Resilience: Bounded exponential backoff on Redis connection failures.
  - Non-crashing: Malformed payloads, invalid versions, and schema errors never crash the consumer.
"""
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import redis
from pydantic import ValidationError

from .config import JudgeConfig, config
from .contracts.judge_job import CONTRACT_VERSION, JudgeJob

logger = logging.getLogger("judge-consumer")


class RedisConsumer:
    """Consumes and deserializes production JudgeJob specifications from Redis."""

    def __init__(self, cfg: Optional[JudgeConfig] = None, client: Optional[redis.Redis] = None):
        self.cfg = cfg or config
        self.queue_name = self.cfg.redis_queue_name
        self.worker_id = self.cfg.worker_id
        self.blpop_timeout = max(1, self.cfg.blpop_timeout)
        self.backoff_initial = self.cfg.redis_backoff_initial
        self.backoff_max = self.cfg.redis_backoff_max
        self.current_backoff = self.backoff_initial

        self.jobs_received = 0
        self.jobs_rejected = 0
        self.redis_errors = 0

        # Lease tracking configuration
        self.lease_prefix = "verniq:submissions:lease:"
        self.active_leases_key = "verniq:submissions:leases:active"
        self.processing_queue = f"verniq:submissions:processing:{self.worker_id}"
        self.default_lease_duration_seconds = 60

        # Redis client instance
        self._injected_client = client is not None
        self.client = client
        if self.client is None:
            self._init_redis_client()

    def _init_redis_client(self):
        """Initializes the Redis client from configuration (URL or host/port)."""
        try:
            if self.cfg.redis_url:
                self.client = redis.from_url(
                    self.cfg.redis_url,
                    decode_responses=True,
                    socket_timeout=self.cfg.redis_socket_timeout,
                    socket_connect_timeout=self.cfg.redis_connect_timeout,
                )
            else:
                self.client = redis.Redis(
                    host=self.cfg.redis_host,
                    port=self.cfg.redis_port,
                    db=self.cfg.redis_db,
                    password=self.cfg.redis_password,
                    decode_responses=True,
                    socket_timeout=self.cfg.redis_socket_timeout,
                    socket_connect_timeout=self.cfg.redis_connect_timeout,
                )
        except Exception as e:
            logger.error(
                "Failed to configure Redis client for worker=%s queue=%s: %s",
                self.worker_id,
                self.queue_name,
                str(e),
            )
            self.client = None

    def ping(self) -> bool:
        """Pings Redis to verify connectivity."""
        if not self.client:
            return False
        try:
            return bool(self.client.ping())
        except Exception:
            return False

    def get_queue_depth(self) -> int:
        """Returns current queue depth (LLEN) without modifying queue state."""
        if not self.client:
            return 0
        try:
            length = self.client.llen(self.queue_name)
            return int(length) if length is not None else 0
        except Exception:
            return 0

    def close(self):
        """Closes the Redis connection cleanly."""
        if self.client:
            try:
                self.client.close()
            except Exception as e:
                logger.warning("Error closing Redis client: %s", e)

    def pop_raw_job(self) -> Optional[Tuple[str, str]]:
        """Executes a blocking BLPOP against the configured queue.

        Returns (queue_name, raw_json_payload) or None on timeout.
        Handles connection failures with exponential backoff without crashing.
        """
        if not self.client:
            self._reconnect()
            if not self.client:
                time.sleep(self.current_backoff)
                self._apply_backoff()
                return None

        try:
            # BLPOP blocks for up to self.blpop_timeout seconds
            result = self.client.blpop(self.queue_name, timeout=self.blpop_timeout)
            # Successful Redis call resets backoff
            self.current_backoff = self.backoff_initial
            if result:
                q_name, raw_payload = result
                self.jobs_received += 1
                return q_name, raw_payload
            return None
        except (redis.RedisError, redis.ConnectionError, redis.TimeoutError, OSError) as e:
            self.redis_errors += 1
            logger.warning(
                "Redis connection error on worker=%s queue=%s. Reconnecting in %.1fs: %s",
                self.worker_id,
                self.queue_name,
                self.current_backoff,
                str(e),
            )
            time.sleep(self.current_backoff)
            self._apply_backoff()
            self._reconnect()
            return None
        except Exception as e:
            self.redis_errors += 1
            logger.error(
                "Unexpected error during Redis blpop on worker=%s: %s",
                self.worker_id,
                str(e),
            )
            time.sleep(self.current_backoff)
            self._apply_backoff()
            return None

    def _apply_backoff(self):
        """Increases backoff up to configured maximum."""
        self.current_backoff = min(self.current_backoff * 2.0, self.backoff_max)

    def _reconnect(self):
        """Attempts to re-establish Redis client connection."""
        if self._injected_client:
            try:
                if self.client:
                    self.client.ping()
                    self.current_backoff = self.backoff_initial
            except Exception:
                pass
            return

        try:
            self.close()
            self._init_redis_client()
            if self.client:
                self.client.ping()
                logger.info(
                    "Reconnected to Redis on worker=%s (queue=%s)",
                    self.worker_id,
                    self.queue_name,
                )
                self.current_backoff = self.backoff_initial
        except Exception:
            pass

    def parse_job(self, raw_payload: str) -> Optional[JudgeJob]:
        """Parses and validates a raw JSON string into a canonical JudgeJob.

        Enforces:
          - Valid JSON syntax
          - Exact contractVersion == "1"
          - Full schema validation via Pydantic JudgeJob
          - Zero crash guarantee on malformed jobs
        """
        # 1. Parse JSON
        try:
            data = json.loads(raw_payload)
        except (json.JSONDecodeError, TypeError) as e:
            self.jobs_rejected += 1
            logger.error(
                "Rejected malformed job (invalid JSON) on worker=%s: %s",
                self.worker_id,
                str(e),
            )
            return None

        if not isinstance(data, dict):
            self.jobs_rejected += 1
            logger.error(
                "Rejected malformed job (payload is not a JSON object) on worker=%s",
                self.worker_id,
            )
            return None

        # 2. Check contractVersion before full model validation for clear error reporting
        version = data.get("contractVersion")
        if version != CONTRACT_VERSION:
            self.jobs_rejected += 1
            logger.error(
                "Rejected job with unsupported contractVersion='%s' on worker=%s (expected '%s')",
                version,
                self.worker_id,
                CONTRACT_VERSION,
            )
            return None

        # 3. Validate against canonical Pydantic JudgeJob contract
        try:
            job = JudgeJob.model_validate(data)
            queue_wait_ms = None
            if hasattr(job, "createdAt") and job.createdAt:
                try:
                    now_utc = datetime.now(timezone.utc)
                    created_dt = job.createdAt if isinstance(job.createdAt, datetime) else datetime.fromisoformat(str(job.createdAt).replace("Z", "+00:00"))
                    queue_wait_ms = max(0, int((now_utc - created_dt).total_seconds() * 1000))
                except Exception:
                    pass
            setattr(job, "_queue_wait_ms", queue_wait_ms)
            logger.info(
                "JOB_RECEIVED worker_id=%s job_id=%s submission_id=%s problem=%s language=%s mode=%s queue_wait_ms=%s",
                self.worker_id,
                job.jobId,
                job.submissionId,
                job.problemVerniqId or job.problemId,
                job.language,
                job.mode.value,
                str(queue_wait_ms) if queue_wait_ms is not None else "N/A",
            )
            return job
        except ValidationError as e:
            self.jobs_rejected += 1
            # Extract safe error summary without logging raw source code or custom input
            errors_summary = [
                f"{'.'.join(str(loc) for loc in err['loc'])}: {err['msg']}"
                for err in e.errors()
            ]
            job_id_hint = data.get("jobId", "unknown")
            sub_id_hint = data.get("submissionId", "unknown")
            logger.error(
                "Rejected job validation failure for jobId=%s submissionId=%s on worker=%s: %s",
                job_id_hint,
                sub_id_hint,
                self.worker_id,
                "; ".join(errors_summary),
            )
            return None
        except Exception as e:
            self.jobs_rejected += 1
            logger.error(
                "Unexpected failure validating job on worker=%s: %s",
                self.worker_id,
                str(e),
            )
            return None

    def pop_job(self) -> Optional[JudgeJob]:
        """High-level consumer method: pops next raw message and parses it into a valid JudgeJob.

        Returns:
          - Valid JudgeJob if a valid job arrived
          - None if queue was empty (timeout) or message was rejected
        """
        popped = self.pop_raw_job()
        if not popped:
            return None

        _, raw_payload = popped
        job = self.parse_job(raw_payload)
        if job is not None:
            setattr(job, "_raw_payload", raw_payload)
        return job

    def claim_lease(
        self,
        job_id: str,
        submission_id: str,
        worker_id: str,
        attempt: int = 1,
        raw_payload: str = "",
        lease_duration_seconds: Optional[int] = None,
    ) -> bool:
        """Atomically registers an in-flight lease for the claimed job."""
        if not self.client:
            return False
        duration = lease_duration_seconds or self.default_lease_duration_seconds
        expires_at_ms = int((time.time() + duration) * 1000)
        lease_key = f"{self.lease_prefix}{job_id}"
        lease_data = {
            "jobId": str(job_id),
            "submissionId": str(submission_id),
            "workerId": str(worker_id),
            "attempt": str(attempt),
            "claimedAt": datetime.now(timezone.utc).isoformat(),
            "leaseExpiresAt": str(expires_at_ms),
            "payload": raw_payload or "",
        }
        try:
            if hasattr(self.client, "pipeline"):
                pipe = self.client.pipeline()
                pipe.hset(lease_key, mapping=lease_data)
                pipe.expire(lease_key, int(duration * 3))
                pipe.zadd(self.active_leases_key, {job_id: expires_at_ms})
                if raw_payload:
                    pipe.rpush(self.processing_queue, raw_payload)
                pipe.execute()
            else:
                self.client.hset(lease_key, mapping=lease_data)
                self.client.expire(lease_key, int(duration * 3))
                self.client.zadd(self.active_leases_key, {job_id: expires_at_ms})
                if raw_payload:
                    self.client.rpush(self.processing_queue, raw_payload)
            logger.info(
                "LEASE_CLAIMED job_id=%s submission_id=%s worker_id=%s attempt=%d expires_in=%ds",
                job_id,
                submission_id,
                worker_id,
                attempt,
                duration,
            )
            return True
        except Exception as e:
            logger.warning("Failed to register lease for job %s: %s", job_id, e)
            return False

    def renew_lease(self, job_id: str, extension_seconds: Optional[int] = None) -> bool:
        """Renews an active lease, extending its expiration timestamp."""
        if not self.client:
            return False
        duration = extension_seconds or self.default_lease_duration_seconds
        expires_at_ms = int((time.time() + duration) * 1000)
        lease_key = f"{self.lease_prefix}{job_id}"
        try:
            if hasattr(self.client, "exists") and not self.client.exists(lease_key):
                return False
            if hasattr(self.client, "pipeline"):
                pipe = self.client.pipeline()
                pipe.hset(lease_key, "leaseExpiresAt", str(expires_at_ms))
                pipe.expire(lease_key, int(duration * 3))
                pipe.zadd(self.active_leases_key, {job_id: expires_at_ms})
                pipe.execute()
            else:
                self.client.hset(lease_key, "leaseExpiresAt", str(expires_at_ms))
                self.client.expire(lease_key, int(duration * 3))
                self.client.zadd(self.active_leases_key, {job_id: expires_at_ms})
            logger.info("LEASE_RENEWED job_id=%s extended_by=%ds", job_id, duration)
            return True
        except Exception as e:
            logger.warning("Failed to renew lease for job %s: %s", job_id, e)
            return False

    def release_lease(self, job_id: str, raw_payload: Optional[str] = None) -> bool:
        """Cleans up the in-flight lease and processing queue entry upon completion."""
        if not self.client:
            return False
        lease_key = f"{self.lease_prefix}{job_id}"
        try:
            if hasattr(self.client, "pipeline"):
                pipe = self.client.pipeline()
                pipe.delete(lease_key)
                pipe.zrem(self.active_leases_key, job_id)
                if raw_payload:
                    pipe.lrem(self.processing_queue, 1, raw_payload)
                pipe.execute()
            else:
                self.client.delete(lease_key)
                self.client.zrem(self.active_leases_key, job_id)
                if raw_payload:
                    self.client.lrem(self.processing_queue, 1, raw_payload)
            logger.info("LEASE_RELEASED job_id=%s", job_id)
            return True
        except Exception as e:
            logger.warning("Failed to release lease for job %s: %s", job_id, e)
            return False

    def recover_stranded_jobs_on_startup(self, max_attempts: int = 3) -> int:
        """Inspects and requeues any in-flight jobs left in the worker's processing queue after a crash."""
        if not self.client:
            return 0
        try:
            items = self.client.lrange(self.processing_queue, 0, -1)
            if not items:
                return 0
            recovered = 0
            for raw_payload in items:
                try:
                    data = json.loads(raw_payload)
                    job_id = data.get("jobId")
                    attempt = int(data.get("attempt", 1))
                    next_attempt = attempt + 1

                    pipe = self.client.pipeline()
                    pipe.lrem(self.processing_queue, 1, raw_payload)
                    if job_id:
                        pipe.delete(f"{self.lease_prefix}{job_id}")
                        pipe.zrem(self.active_leases_key, job_id)

                    if attempt < max_attempts:
                        data["attempt"] = next_attempt
                        requeue_payload = json.dumps(data)
                        pipe.rpush(self.queue_name, requeue_payload)
                        logger.warning(
                            "STRANDED_JOB_REQUEUED worker_id=%s job_id=%s attempt=%d->%d",
                            self.worker_id,
                            job_id,
                            attempt,
                            next_attempt,
                        )
                        recovered += 1
                    else:
                        logger.error(
                            "STRANDED_JOB_EXHAUSTED worker_id=%s job_id=%s attempt=%d max_attempts=%d",
                            self.worker_id,
                            job_id,
                            attempt,
                            max_attempts,
                        )
                    pipe.execute()
                except Exception as parse_err:
                    self.client.lrem(self.processing_queue, 1, raw_payload)
                    logger.warning("Failed to parse stranded job payload: %s", parse_err)
            return recovered
        except Exception as e:
            logger.warning("Error recovering stranded jobs on startup: %s", e)
            return 0
