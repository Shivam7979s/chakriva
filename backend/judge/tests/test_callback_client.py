"""Tests for Production Judge Result Callback Client (Phase J.5.4).

Verifies all 16 specification points from Phase J.5.4 requirements:
  1. Successful callback
  2. JSON serialization
  3. X-Internal-Secret header
  4. No secret in logs
  5. Retry on connection error
  6. Retry on HTTP 5xx
  7. No retry on 401
  8. No retry on 403
  9. No retry on 400
  10. Maximum retry count enforced
  11. Timeout handled
  12. Callback disabled when URL absent
  13. Missing secret with configured callback fails safely
  14. Hidden expected output remains suppressed
  15. sourceCode never serialized
  16. Worker continues after callback failure
"""
import io
import json
import logging
import os
import sys
import unittest
import urllib.error
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.callback.client import (
    DEFAULT_TIMEOUT_SECONDS,
    HEADER_INTERNAL_SECRET,
    MAX_CALLBACK_RETRIES,
    JudgeCallbackClient,
)
from src.config import JudgeConfig
from src.contracts.judge_job import JobMode, JudgeJob
from src.contracts.judge_result import (
    FirstFailedTest,
    JobTelemetry,
    JudgeJobStatus,
    JudgeResult,
    JudgeVerdict,
)
from src.runner.sandbox import ExecutionResult, SandboxRunner
from src.worker import JudgeWorker


def _sample_judge_result(
    job_id: str = "job-cb-test-1",
    submission_id: str = "sub-cb-test-1",
    verdict: JudgeVerdict = JudgeVerdict.ACCEPTED,
    first_failed: FirstFailedTest = None,
) -> JudgeResult:
    return JudgeResult(
        contractVersion="1",
        jobId=job_id,
        submissionId=submission_id,
        workerId="judge-test-worker-1",
        status=JudgeJobStatus.COMPLETED if verdict != JudgeVerdict.INTERNAL_ERROR else JudgeJobStatus.INTERNAL_ERROR,
        verdict=verdict,
        runtimeMs=42,
        memoryKb=1024,
        testCasesPassed=5,
        totalTestCases=5,
        firstFailedTest=first_failed,
        telemetry=JobTelemetry(executionMs=42, totalMs=50),
        completedAt=datetime.now(timezone.utc),
    )


class TestJudgeCallbackClient(unittest.TestCase):

    def setUp(self):
        self.test_url = "http://127.0.0.1:8080/api/v1/internal/judge/results"
        self.test_secret = "test-internal-secret-xyz-987"
        self.fast_delays = [0.0, 0.01, 0.01, 0.01]

    def test_01_successful_callback(self):
        """1. Successful callback delivered with HTTP 200."""
        client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )
        res = _sample_judge_result()

        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.getcode.return_value = 200
        mock_resp.__enter__.return_value = mock_resp

        with patch("urllib.request.urlopen", return_value=mock_resp) as mock_urlopen:
            success = client.send_result(res)

        self.assertTrue(success)
        self.assertEqual(client.callback_attempts, 1)
        self.assertEqual(client.callback_success, 1)
        self.assertEqual(client.callback_failures, 0)
        mock_urlopen.assert_called_once()

    def test_02_json_serialization(self):
        """2. JSON serialization matches canonical schema and valid types."""
        client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )
        res = _sample_judge_result()

        captured_requests = []

        def fake_urlopen(req, timeout=None):
            captured_requests.append(req)
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.getcode.return_value = 200
            mock_resp.__enter__.return_value = mock_resp
            return mock_resp

        with patch("urllib.request.urlopen", side_effect=fake_urlopen):
            client.send_result(res)

        self.assertEqual(len(captured_requests), 1)
        req = captured_requests[0]
        self.assertEqual(req.headers.get("Content-type"), "application/json; charset=utf-8")

        body_dict = json.loads(req.data.decode("utf-8"))
        self.assertEqual(body_dict["contractVersion"], "1")
        self.assertEqual(body_dict["jobId"], "job-cb-test-1")
        self.assertEqual(body_dict["submissionId"], "sub-cb-test-1")
        self.assertEqual(body_dict["verdict"], "ACCEPTED")
        self.assertEqual(body_dict["status"], "COMPLETED")
        self.assertEqual(body_dict["runtimeMs"], 42)
        self.assertEqual(body_dict["memoryKb"], 1024)

    def test_03_x_internal_secret_header(self):
        """3. X-Internal-Secret header is attached to request."""
        client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )
        res = _sample_judge_result()

        captured_requests = []

        def fake_urlopen(req, timeout=None):
            captured_requests.append(req)
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.__enter__.return_value = mock_resp
            return mock_resp

        with patch("urllib.request.urlopen", side_effect=fake_urlopen):
            client.send_result(res)

        req = captured_requests[0]
        self.assertEqual(req.headers.get("X-internal-secret"), self.test_secret)

    def test_04_no_secret_in_logs(self):
        """4. Configured secret is NEVER emitted in any log record."""
        client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )
        res = _sample_judge_result()

        log_stream = io.StringIO()
        handler = logging.StreamHandler(log_stream)
        callback_logger = logging.getLogger("src.callback.client")
        callback_logger.addHandler(handler)
        callback_logger.setLevel(logging.DEBUG)

        try:
            # Trigger both success and error logging
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.__enter__.return_value = mock_resp
            with patch("urllib.request.urlopen", return_value=mock_resp):
                client.send_result(res)

            # Trigger HTTP error logging
            err = urllib.error.HTTPError(
                url=self.test_url,
                code=403,
                msg="Forbidden",
                hdrs={},
                fp=io.BytesIO(b'{"error": "Forbidden"}'),
            )
            with patch("urllib.request.urlopen", side_effect=err):
                client.send_result(res)

            logs = log_stream.getvalue()
            self.assertNotIn(self.test_secret, logs)
        finally:
            callback_logger.removeHandler(handler)

    def test_05_retry_on_connection_error(self):
        """5. Retries on transient network/connection error."""
        client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )
        res = _sample_judge_result()

        attempts = [0]

        def fake_urlopen(req, timeout=None):
            attempts[0] += 1
            if attempts[0] < 3:
                raise urllib.error.URLError("Connection refused")
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.__enter__.return_value = mock_resp
            return mock_resp

        with patch("urllib.request.urlopen", side_effect=fake_urlopen):
            success = client.send_result(res)

        self.assertTrue(success)
        self.assertEqual(attempts[0], 3)
        self.assertEqual(client.callback_attempts, 3)
        self.assertEqual(client.callback_retries, 2)
        self.assertEqual(client.callback_success, 1)

    def test_06_retry_on_http_5xx(self):
        """6. Retries on transient HTTP 5xx errors."""
        client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )
        res = _sample_judge_result()

        attempts = [0]

        def fake_urlopen(req, timeout=None):
            attempts[0] += 1
            if attempts[0] == 1:
                raise urllib.error.HTTPError(self.test_url, 500, "Internal Server Error", {}, io.BytesIO(b""))
            elif attempts[0] == 2:
                raise urllib.error.HTTPError(self.test_url, 503, "Service Unavailable", {}, io.BytesIO(b""))
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.__enter__.return_value = mock_resp
            return mock_resp

        with patch("urllib.request.urlopen", side_effect=fake_urlopen):
            success = client.send_result(res)

        self.assertTrue(success)
        self.assertEqual(attempts[0], 3)
        self.assertEqual(client.callback_success, 1)

    def test_07_no_retry_on_401(self):
        """7. No retry on HTTP 401 Unauthorized."""
        client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )
        res = _sample_judge_result()

        err = urllib.error.HTTPError(self.test_url, 401, "Unauthorized", {}, io.BytesIO(b""))
        with patch("urllib.request.urlopen", side_effect=err) as mock_urlopen:
            success = client.send_result(res)

        self.assertFalse(success)
        self.assertEqual(mock_urlopen.call_count, 1)
        self.assertEqual(client.callback_attempts, 1)
        self.assertEqual(client.callback_auth_failures, 1)
        self.assertEqual(client.callback_retries, 0)

    def test_08_no_retry_on_403(self):
        """8. No retry on HTTP 403 Forbidden."""
        client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )
        res = _sample_judge_result()

        err = urllib.error.HTTPError(self.test_url, 403, "Forbidden", {}, io.BytesIO(b""))
        with patch("urllib.request.urlopen", side_effect=err) as mock_urlopen:
            success = client.send_result(res)

        self.assertFalse(success)
        self.assertEqual(mock_urlopen.call_count, 1)
        self.assertEqual(client.callback_attempts, 1)
        self.assertEqual(client.callback_auth_failures, 1)
        self.assertEqual(client.callback_retries, 0)

    def test_09_no_retry_on_400(self):
        """9. No retry on HTTP 400 Bad Request."""
        client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )
        res = _sample_judge_result()

        err = urllib.error.HTTPError(self.test_url, 400, "Bad Request", {}, io.BytesIO(b""))
        with patch("urllib.request.urlopen", side_effect=err) as mock_urlopen:
            success = client.send_result(res)

        self.assertFalse(success)
        self.assertEqual(mock_urlopen.call_count, 1)
        self.assertEqual(client.callback_attempts, 1)
        self.assertEqual(client.callback_validation_failures, 1)
        self.assertEqual(client.callback_retries, 0)

    def test_10_maximum_retry_count_enforced(self):
        """10. Maximum retry count of 4 attempts strictly enforced."""
        client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )
        res = _sample_judge_result()

        err = urllib.error.HTTPError(self.test_url, 500, "Internal Server Error", {}, io.BytesIO(b""))
        with patch("urllib.request.urlopen", side_effect=err) as mock_urlopen:
            success = client.send_result(res)

        self.assertFalse(success)
        self.assertEqual(mock_urlopen.call_count, 4)
        self.assertEqual(client.callback_attempts, 4)
        self.assertEqual(client.callback_retries, 3)
        self.assertEqual(client.callback_failures, 1)

    def test_11_timeout_handled(self):
        """11. Timeout error handled gracefully as transient failure."""
        client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )
        res = _sample_judge_result()

        with patch("urllib.request.urlopen", side_effect=TimeoutError("Request timed out")) as mock_urlopen:
            success = client.send_result(res)

        self.assertFalse(success)
        self.assertEqual(mock_urlopen.call_count, 4)
        self.assertEqual(client.callback_failures, 1)

    def test_12_callback_disabled_when_url_absent(self):
        """12. Callback disabled and safe no-op when URL is absent."""
        client = JudgeCallbackClient(callback_url=None, internal_secret=None)
        res = _sample_judge_result()

        self.assertFalse(client.is_enabled)
        with patch("urllib.request.urlopen") as mock_urlopen:
            success = client.send_result(res)

        self.assertFalse(success)
        mock_urlopen.assert_not_called()
        self.assertEqual(client.callback_attempts, 0)

    def test_13_missing_secret_with_configured_callback_fails_safely(self):
        """13. Missing secret with configured callback URL fails fast with ValueError."""
        with self.assertRaises(ValueError) as ctx:
            JudgeCallbackClient(
                callback_url=self.test_url,
                internal_secret="",
            )
        self.assertIn("VERNIQ_JUDGE_INTERNAL_SECRET is missing", str(ctx.exception))

        with self.assertRaises(ValueError):
            JudgeCallbackClient(
                callback_url=self.test_url,
                internal_secret=None,
            )

    def test_14_hidden_expected_output_remains_suppressed(self):
        """14. Hidden expected output is suppressed and never leaked in payload."""
        client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )

        failed_hidden = FirstFailedTest(
            testNumber=4,
            actualOutput="output_actual",
            expectedOutput=None,  # J.5.1 already requires None
            isSample=False,
            failureType="WRONG_ANSWER",
        )
        res = _sample_judge_result(
            verdict=JudgeVerdict.WRONG_ANSWER,
            first_failed=failed_hidden,
        )

        captured_requests = []

        def fake_urlopen(req, timeout=None):
            captured_requests.append(req)
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.__enter__.return_value = mock_resp
            return mock_resp

        with patch("urllib.request.urlopen", side_effect=fake_urlopen):
            client.send_result(res)

        payload = json.loads(captured_requests[0].data.decode("utf-8"))
        first_failed_dict = payload["firstFailedTest"]
        self.assertIsNone(first_failed_dict["expectedOutput"])
        self.assertFalse(first_failed_dict["isSample"])

    def test_15_source_code_never_serialized(self):
        """15. sourceCode field is NEVER included in JudgeResult callback payload."""
        client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )
        res = _sample_judge_result()

        captured_requests = []

        def fake_urlopen(req, timeout=None):
            captured_requests.append(req)
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_resp.__enter__.return_value = mock_resp
            return mock_resp

        with patch("urllib.request.urlopen", side_effect=fake_urlopen):
            client.send_result(res)

        payload = json.loads(captured_requests[0].data.decode("utf-8"))
        self.assertNotIn("sourceCode", payload)
        self.assertNotIn("source_code", payload)

    def test_16_worker_continues_after_callback_failure(self):
        """16. Worker continues normally after callback failure without rerunning user code."""
        failing_client = JudgeCallbackClient(
            callback_url=self.test_url,
            internal_secret=self.test_secret,
            backoff_delays=self.fast_delays,
        )
        mock_runner = MagicMock(spec=SandboxRunner)
        mock_runner.execute.return_value = ExecutionResult(
            verdict="accepted",
            runtime_ms=30,
            memory_kb=512,
            test_cases_passed=3,
            total_test_cases=3,
        )

        worker = JudgeWorker(
            runner=mock_runner,
            callback_client=failing_client,
        )

        job = JudgeJob(
            jobId="job-cb-fail-test",
            submissionId="sub-cb-fail-test",
            problemId="prob-1",
            problemVerniqId="VRQ-0001",
            language="python",
            sourceCode="print('hello')",
            mode=JobMode.RUN,
            customInput="",
        )

        # Force callback delivery to fail via 500 error
        err = urllib.error.HTTPError(self.test_url, 500, "Server Error", {}, io.BytesIO(b""))
        with patch("urllib.request.urlopen", side_effect=err):
            result = worker.execute_job(job)

        # Worker successfully returned result, did NOT crash
        self.assertIsNotNone(result)
        self.assertEqual(result.verdict, JudgeVerdict.ACCEPTED)
        # SandboxRunner was executed EXACTLY ONCE (did NOT re-run user code)
        mock_runner.execute.assert_called_once()
        # Worker state was cleanly reset to WAITING_FOR_JOB
        self.assertEqual(worker.state, "WAITING_FOR_JOB")
        # Callback failures were recorded
        self.assertEqual(failing_client.callback_failures, 1)


if __name__ == "__main__":
    unittest.main()
