"""Production Judge Result Callback Client (Phase J.5.4).

Transports completed JudgeResult contracts back to the Chakriva Application Plane
via authenticated internal HTTP callback.
Enforces:
  - Constant-time internal secret authentication header (X-Internal-Secret)
  - Bounded exponential backoff retries on transient errors (max 4 attempts)
  - Immediate fail-fast without retry on auth errors (401, 403) and validation errors (400, 422, 409)
  - Anti-leak data hygiene: never transmits sourceCode, suppresses hidden expected outputs
  - Zero leakage of secrets, code, or tokens in logs
  - Safe error handling: never crashes worker and never triggers re-execution on callback failure
"""
import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

from ..contracts.judge_result import JudgeResult

logger = logging.getLogger(__name__)

HEADER_INTERNAL_SECRET = "X-Internal-Secret"
DEFAULT_TIMEOUT_SECONDS = 10.0
MAX_CALLBACK_RETRIES = 4
RETRY_BACKOFF_DELAYS = [0.0, 1.0, 2.0, 4.0]


class JudgeCallbackClient:
    """Dedicated HTTP client for delivering JudgeResults to Spring Boot."""

    def __init__(
        self,
        callback_url: Optional[str] = None,
        internal_secret: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
        max_retries: int = MAX_CALLBACK_RETRIES,
        backoff_delays: Optional[List[float]] = None,
    ):
        self.callback_url = callback_url.strip() if callback_url and callback_url.strip() else None
        self.internal_secret = internal_secret.strip() if internal_secret and internal_secret.strip() else None
        self.timeout = float(timeout)
        self.max_retries = int(max_retries)
        self.backoff_delays = backoff_delays if backoff_delays is not None else RETRY_BACKOFF_DELAYS

        # Mandatory configuration validation
        if self.callback_url and not self.internal_secret:
            raise ValueError(
                "JUDGE_CALLBACK_URL is configured but VERNIQ_JUDGE_INTERNAL_SECRET is missing. "
                "Unauthenticated production callbacks are strictly prohibited."
            )

        self.sanitized_url = self._sanitize_url(self.callback_url) if self.callback_url else None

        # Operational telemetry counters
        self.callback_attempts = 0
        self.callback_success = 0
        self.callback_failures = 0
        self.callback_retries = 0
        self.callback_auth_failures = 0
        self.callback_validation_failures = 0

    @property
    def is_enabled(self) -> bool:
        """Indicates whether callback delivery is active."""
        return self.callback_url is not None

    @staticmethod
    def _sanitize_url(url: str) -> str:
        """Strips query parameters and user credentials for safe structured logging."""
        try:
            parsed = urllib.parse.urlsplit(url)
            netloc = parsed.netloc.split("@")[-1]  # remove basic-auth credentials if present
            return urllib.parse.urlunsplit((parsed.scheme, netloc, parsed.path, "", ""))
        except Exception:
            return "sanitized://url"

    def send_result(self, result: JudgeResult) -> bool:
        """Delivers a JudgeResult to the Spring Boot callback endpoint.

        Returns:
            bool: True if delivered successfully (HTTP 2xx), False on failure.
        """
        if not self.is_enabled:
            logger.debug(
                "Judge callback skipped: callback client is disabled (url is absent). "
                "Job %s result kept in memory.",
                result.jobId,
            )
            return False

        # Enforce anti-leak verification before serialization
        if result.firstFailedTest and not result.firstFailedTest.isSample:
            if result.firstFailedTest.expectedOutput is not None:
                logger.warning(
                    "Anti-leak guard: suppressed unexpected expectedOutput on hidden test %d for job %s",
                    result.firstFailedTest.testNumber,
                    result.jobId,
                )
                result.firstFailedTest.expectedOutput = None

        payload_bytes = result.model_dump_json().encode("utf-8")

        headers = {
            "Content-Type": "application/json; charset=utf-8",
            HEADER_INTERNAL_SECRET: self.internal_secret,
            "User-Agent": "Verniq-JudgeWorker/1.0",
        }

        attempts_limit = min(self.max_retries, len(self.backoff_delays))

        for attempt_idx in range(attempts_limit):
            attempt_num = attempt_idx + 1
            delay = self.backoff_delays[attempt_idx]

            if delay > 0:
                self.callback_retries += 1
                logger.info(
                    "Backoff sleeping %.1fs before callback retry attempt %d/%d for job %s",
                    delay,
                    attempt_num,
                    attempts_limit,
                    result.jobId,
                )
                time.sleep(delay)

            self.callback_attempts += 1
            start_time = time.perf_counter()

            try:
                req = urllib.request.Request(
                    url=self.callback_url,
                    data=payload_bytes,
                    headers=headers,
                    method="POST",
                )

                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    status_code = resp.status if hasattr(resp, "status") else resp.getcode()
                    duration_ms = (time.perf_counter() - start_time) * 1000.0

                    if 200 <= status_code < 300:
                        self.callback_success += 1
                        logger.info(
                            "judge_callback_success worker_id=%s job_id=%s submission_id=%s "
                            "endpoint=%s attempt=%d status=%d duration_ms=%.1f",
                            result.workerId,
                            result.jobId,
                            result.submissionId,
                            self.sanitized_url,
                            attempt_num,
                            status_code,
                            duration_ms,
                        )
                        return True
                    else:
                        logger.warning(
                            "Unexpected non-error status %d on callback attempt %d for job %s",
                            status_code,
                            attempt_num,
                            result.jobId,
                        )

            except urllib.error.HTTPError as err:
                duration_ms = (time.perf_counter() - start_time) * 1000.0
                status_code = err.code

                logger.warn(
                    "judge_callback_http_error worker_id=%s job_id=%s submission_id=%s "
                    "endpoint=%s attempt=%d status=%d duration_ms=%.1f",
                    result.workerId,
                    result.jobId,
                    result.submissionId,
                    self.sanitized_url,
                    attempt_num,
                    status_code,
                    duration_ms,
                )

                # Strict fail-fast rules: NEVER retry authentication or payload rejection errors
                if status_code in (401, 403):
                    self.callback_auth_failures += 1
                    self.callback_failures += 1
                    logger.error(
                        "Judge callback authorization failed (HTTP %d). "
                        "Check VERNIQ_JUDGE_INTERNAL_SECRET configuration. Terminating retries.",
                        status_code,
                    )
                    return False

                if status_code in (400, 422, 409):
                    self.callback_validation_failures += 1
                    self.callback_failures += 1
                    logger.error(
                        "Judge callback payload rejected by server (HTTP %d). Terminating retries.",
                        status_code,
                    )
                    return False

                # Transient server errors (5xx): eligible for retry if attempts remain
                if 500 <= status_code < 600:
                    if attempt_num >= attempts_limit:
                        self.callback_failures += 1
                        logger.error(
                            "Judge callback server error (HTTP %d) exhausted all %d attempts for job %s.",
                            status_code,
                            attempts_limit,
                            result.jobId,
                        )
                        return False
                    continue

                # Any other 4xx: do not retry
                self.callback_failures += 1
                return False

            except (urllib.error.URLError, TimeoutError, OSError) as net_err:
                duration_ms = (time.perf_counter() - start_time) * 1000.0
                logger.warn(
                    "judge_callback_network_error worker_id=%s job_id=%s submission_id=%s "
                    "endpoint=%s attempt=%d error=%s duration_ms=%.1f",
                    result.workerId,
                    result.jobId,
                    result.submissionId,
                    self.sanitized_url,
                    attempt_num,
                    type(net_err).__name__,
                    duration_ms,
                )

                if attempt_num >= attempts_limit:
                    self.callback_failures += 1
                    logger.error(
                        "Judge callback network error exhausted all %d attempts for job %s.",
                        attempts_limit,
                        result.jobId,
                    )
                    return False
                continue

            except Exception as unk_err:
                self.callback_failures += 1
                logger.error(
                    "Unexpected callback exception for job %s: %s",
                    result.jobId,
                    type(unk_err).__name__,
                )
                return False

        self.callback_failures += 1
        return False

    def get_telemetry(self) -> Dict[str, Any]:
        """Returns safe callback telemetry counters."""
        return {
            "callback_configured": self.is_enabled,
            "callback_attempts": self.callback_attempts,
            "callback_success": self.callback_success,
            "callback_failures": self.callback_failures,
            "callback_retries": self.callback_retries,
            "callback_auth_failures": self.callback_auth_failures,
            "callback_validation_failures": self.callback_validation_failures,
        }
