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

        # Telemetry counters
        self.jobs_received = 0
        self.jobs_rejected = 0
        self.redis_errors = 0

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
        return self.parse_job(raw_payload)
