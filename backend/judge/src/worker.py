"""CHAKRIVA Online Judge Worker & Execution Server Daemon (Phase J.5.3).

Consumes validated JudgeJob specifications from Redis via blocking BLPOP transport.
Strict separation:
  - Transport: Redis LIST (verniq:submissions:queue) via RedisConsumer
  - Contract: JudgeJob (v1) and JudgeResult (v1)
  - Engine: SandboxRunner / ExecutionResult / LanguageProfile / ActiveJobRegistry
  - Canonical Data: Server-side test case resolution (Supabase / PostgREST)
  - Result Persistence: Kept in-memory for J.5.3 (Callback deferred to J.5.4)
"""
import concurrent.futures
import json
import logging
import signal
import sys
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Dict, List, Optional

try:
    from supabase import Client, create_client
except ImportError:
    create_client = None
    Client = None

from .config import JudgeConfig, config
from .consumer import RedisConsumer
from .contracts.judge_job import JobMode, JudgeJob
from .contracts.judge_result import JudgeJobStatus, JudgeResult, JudgeVerdict
from .callback.client import JudgeCallbackClient
from .runner.sandbox import ExecutionResult, ExecutionTelemetry, SandboxRunner, TestCaseItem, job_registry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [JUDGE] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("judge-worker")


class JudgeWorker:
    """Production judge worker daemon consuming jobs from Redis and executing via SandboxRunner."""

    def __init__(
        self,
        consumer: Optional[RedisConsumer] = None,
        runner: Optional[SandboxRunner] = None,
        cfg: Optional[JudgeConfig] = None,
        callback_client: Optional[JudgeCallbackClient] = None,
    ):
        self.state = "STARTING"
        self.running = True
        self.cfg = cfg or (consumer.cfg if consumer else config)
        self.worker_id = self.cfg.worker_id

        # Internal authenticated callback client (Phase J.5.4)
        if callback_client is not None:
            self.callback_client = callback_client
        else:
            cb_url = getattr(self.cfg, "judge_callback_url", None) or getattr(self.cfg, "spring_boot_callback_url", None)
            cb_secret = getattr(self.cfg, "judge_internal_secret", "") or getattr(self.cfg, "internal_api_secret", "")
            self.callback_client = JudgeCallbackClient(
                callback_url=cb_url,
                internal_secret=cb_secret,
            )

        # Isolated execution engine
        self.runner = runner or SandboxRunner(
            time_limit_seconds=self.cfg.max_cpu_time_seconds,
            memory_limit_mb=self.cfg.max_memory_mb,
        )

        # Worker concurrency (defaults to 1 for t3.micro target)
        self.executor = concurrent.futures.ThreadPoolExecutor(
            max_workers=self.cfg.worker_concurrency,
            thread_name_prefix=f"{self.worker_id}-pool"
        )

        # Redis production consumer
        self.consumer = consumer or RedisConsumer(cfg=self.cfg)

        # Supabase / Canonical test retrieval client
        self.supabase = None
        self._canonical_cache: Dict[str, List[TestCaseItem]] = {}
        self._init_supabase()

        # Telemetry & Operational Health metrics
        self.jobs_started = 0
        self.jobs_completed = 0
        self.job_failures = 0
        self.current_job_id: Optional[str] = None
        self.last_job_received_at: Optional[str] = None
        self.last_job_completed_at: Optional[str] = None
        self.latest_result: Optional[JudgeResult] = None

        self.state = "READY"
        logger.info(
            "JudgeWorker initialized [worker_id=%s, queue=%s, concurrency=%d, state=%s]",
            self.worker_id,
            self.consumer.queue_name,
            config.worker_concurrency,
            self.state,
        )

    def _init_supabase(self):
        """Initializes Supabase client solely for canonical test retrieval."""
        if not create_client:
            logger.info("Supabase Python library not installed. Running in standalone sandbox mode.")
            return

        key = config.supabase_service_role_key or config.supabase_anon_key
        if config.supabase_url and key:
            try:
                self.supabase = create_client(config.supabase_url, key)
                logger.info(f"Supabase client initialized for canonical test access at {config.supabase_url}")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                self.supabase = None
        else:
            logger.info("Supabase credentials not configured. Operating in standalone sandbox mode.")

    def fetch_canonical_test_cases(self, problem_id: Optional[str]) -> List[TestCaseItem]:
        """Fetches canonical test cases for a problem, using in-memory cache and service_role PostgREST.

        Guarantees:
          - Canonical test cases are strictly loaded server-side.
          - Never transmitted in Redis or exposed to client requests.
        """
        if not problem_id:
            return []

        if problem_id in self._canonical_cache:
            return self._canonical_cache[problem_id]

        # 1. Try Supabase Python client if available
        if self.supabase:
            try:
                res = (
                    self.supabase.table("test_cases")
                    .select("input, expected_output, is_sample")
                    .eq("problem_id", problem_id)
                    .order("order_index", desc=False)
                    .execute()
                )
                if res.data and len(res.data) > 0:
                    cases = [
                        TestCaseItem(
                            input=tc["input"],
                            expected_output=tc.get("expected_output"),
                            is_sample=tc.get("is_sample", False),
                        )
                        for tc in res.data
                    ]
                    self._canonical_cache[problem_id] = cases
                    logger.info(
                        "Loaded and cached %d canonical test cases for problem %s via Supabase client",
                        len(cases),
                        problem_id,
                    )
                    return cases
            except Exception as e:
                logger.warning("Supabase client query failed for %s: %s", problem_id, e)

        # 2. Direct PostgREST query using service_role key via urllib
        key = config.supabase_service_role_key or config.supabase_anon_key
        if config.supabase_url and key:
            try:
                import urllib.request
                url = f"{config.supabase_url}/rest/v1/test_cases?problem_id=eq.{problem_id}&select=input,expected_output,is_sample&order=order_index.asc"
                headers = {
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                }
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=15.0) as resp:
                    raw_data = json.loads(resp.read().decode("utf-8"))
                    if raw_data and len(raw_data) > 0:
                        cases = [
                            TestCaseItem(
                                input=tc["input"],
                                expected_output=tc.get("expected_output"),
                                is_sample=tc.get("is_sample", False),
                            )
                            for tc in raw_data
                        ]
                        self._canonical_cache[problem_id] = cases
                        logger.info(
                            "Loaded and cached %d canonical test cases for problem %s via PostgREST",
                            len(cases),
                            problem_id,
                        )
                        return cases
            except Exception as e:
                logger.error("PostgREST query failed for %s: %s", problem_id, e)

        logger.warning("Could not load canonical test cases for problem %s", problem_id)
        return []

    def execute_job(self, job: JudgeJob) -> JudgeResult:
        """Executes a validated JudgeJob through the existing SandboxRunner engine.

        Steps:
          1. Sets lifecycle state to PROCESSING.
          2. Prepares test cases based on execution mode (RUN vs SUBMIT).
          3. Executes code via SandboxRunner.
          4. Maps ExecutionResult to versioned JudgeResult contract.
          5. Stores JudgeResult in memory (callback deferred to Phase J.5.4).
          6. Returns state to WAITING_FOR_JOB.
        """
        self.state = "PROCESSING"
        self.current_job_id = job.jobId
        self.jobs_started += 1
        self.last_job_received_at = datetime.now(timezone.utc).isoformat()

        logger.info(
            "judge_job_started worker_id=%s job_id=%s submission_id=%s problem=%s language=%s mode=%s",
            self.worker_id,
            job.jobId,
            job.submissionId,
            job.problemVerniqId or job.problemId,
            job.language,
            job.mode.value,
        )

        try:
            # Mode resolution
            if job.mode == JobMode.RUN:
                is_custom_run = True
                test_cases = [
                    TestCaseItem(
                        input=job.customInput or "",
                        expected_output=None,
                        is_sample=True,
                    )
                ]
            else:  # SUBMIT mode
                is_custom_run = False
                test_cases = self.fetch_canonical_test_cases(job.problemId)
                if not test_cases:
                    logger.warning("No canonical test cases found for problem %s in SUBMIT mode", job.problemId)
                    test_cases = [TestCaseItem(input="", expected_output=None)]

            # Dispatch to existing execution sandbox
            received_ts = job.createdAt.isoformat() if hasattr(job.createdAt, "isoformat") else str(job.createdAt)
            exec_res: ExecutionResult = self.runner.execute(
                language=job.language,
                source_code=job.sourceCode,
                test_cases=test_cases,
                is_custom_run=is_custom_run,
                execution_id=job.jobId,
                received_timestamp=received_ts,
            )

            # Map ExecutionResult to canonical J.5.1 JudgeResult
            judge_res = JudgeResult.from_execution_result(
                job_id=job.jobId,
                submission_id=job.submissionId,
                worker_id=self.worker_id,
                exec_res=exec_res,
            )

        except Exception as e:
            logger.error(
                "Execution engine unexpected error for job_id=%s submission_id=%s: %s",
                job.jobId,
                job.submissionId,
                str(e),
            )
            judge_res = JudgeResult(
                contractVersion="1",
                jobId=job.jobId,
                submissionId=job.submissionId,
                workerId=self.worker_id,
                status=JudgeJobStatus.INTERNAL_ERROR,
                verdict=JudgeVerdict.INTERNAL_ERROR,
                runtimeMs=0,
                memoryKb=0,
                testCasesPassed=0,
                totalTestCases=0,
                stderrOutput=f"Worker internal error: {str(e)}",
            )

        # Update telemetry and store in memory
        self.latest_result = judge_res
        self.last_job_completed_at = datetime.now(timezone.utc).isoformat()
        self.jobs_completed += 1
        if judge_res.status == JudgeJobStatus.INTERNAL_ERROR or judge_res.verdict == JudgeVerdict.INTERNAL_ERROR:
            self.job_failures += 1

        logger.info(
            "judge_job_completed worker_id=%s job_id=%s submission_id=%s verdict=%s runtime_ms=%d passed=%d/%d status=%s",
            self.worker_id,
            job.jobId,
            job.submissionId,
            judge_res.verdict.value,
            judge_res.runtimeMs,
            judge_res.testCasesPassed,
            judge_res.totalTestCases,
            judge_res.status.value,
        )

        # Deliver result to application plane via callback if enabled (Phase J.5.4)
        if self.callback_client and self.callback_client.is_enabled:
            try:
                cb_ok = self.callback_client.send_result(judge_res)
                if not cb_ok:
                    logger.warning(
                        "Callback delivery failed for job %s (submission %s). "
                        "Result safely retained in worker memory. User code will NOT be re-executed.",
                        job.jobId,
                        job.submissionId,
                    )
            except Exception as cb_err:
                logger.error(
                    "Unexpected exception during callback delivery for job %s: %s. "
                    "Worker continuing normally.",
                    job.jobId,
                    cb_err,
                )

        self.current_job_id = None
        self.state = "WAITING_FOR_JOB"
        return judge_res

    def run(self):
        """Primary production worker loop: consumes from Redis via BLPOP.

        Guarantees:
          - Does NOT poll Supabase for pending submissions.
          - Blocks on Redis BLPOP (no busy-spin).
          - Supports clean graceful exit on shutdown.
        """
        self.state = "WAITING_FOR_JOB"
        logger.info("JudgeWorker entering job consumption loop (queue=%s)...", self.consumer.queue_name)

        while self.running:
            job = self.consumer.pop_job()
            if job is not None:
                self.execute_job(job)

        self.state = "STOPPED"
        logger.info("JudgeWorker job consumption loop terminated.")

    def start_polling(self):
        """Alias for run() to maintain backwards-compatibility."""
        self.run()

    def stop(self):
        """Initiates graceful shutdown of worker daemon."""
        logger.info("Initiating graceful shutdown for JudgeWorker (worker_id=%s)...", self.worker_id)
        self.state = "STOPPING"
        self.running = False
        self.consumer.close()
        self.executor.shutdown(wait=False)
        self.state = "STOPPED"
        logger.info("JudgeWorker shutdown complete.")

    def get_health_status(self) -> dict:
        """Returns safe operational health information without exposing source code or secrets."""
        redis_ok = self.consumer.ping()
        overall_status = "healthy" if redis_ok else "degraded"
        if not self.running or self.state in ("STOPPING", "STOPPED"):
            overall_status = "stopping" if self.state == "STOPPING" else "stopped"

        docker_ok = self.runner.docker_sandbox.is_available() if hasattr(self.runner, "docker_sandbox") else False
        if config.docker_enabled and not docker_ok and redis_ok:
            overall_status = "degraded"

        return {
            "status": overall_status,
            "worker": self.worker_id,
            "state": self.state,
            "connected_to_redis": redis_ok,
            "docker_available": docker_ok,
            "current_job_id": self.current_job_id,
            "jobs_received": self.consumer.jobs_received,
            "jobs_started": self.jobs_started,
            "jobs_completed": self.jobs_completed,
            "jobs_failed": self.job_failures,
            "jobs_rejected": self.consumer.jobs_rejected,
            "redis_errors": self.consumer.redis_errors,
            "concurrency": config.worker_concurrency,
            "cache_enabled": config.cache_enabled,
            "callback_configured": self.callback_client.is_enabled if self.callback_client else False,
            "sandbox": self.runner.docker_sandbox.get_telemetry() if hasattr(self.runner, "docker_sandbox") else {},
            "last_job_received_at": self.last_job_received_at,
            "last_job_completed_at": self.last_job_completed_at,
            "time": datetime.now(timezone.utc).isoformat(),
        }


def create_http_handler(worker: JudgeWorker):
    """Creates a Threading HTTP request handler for health, telemetry, and legacy test endpoints."""
    class JudgeRequestHandler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def _send_cors_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Execution-ID")

        def _send_json(self, status_code: int, data_bytes: bytes):
            self.send_response(status_code)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data_bytes)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(data_bytes)
            self.wfile.flush()

        def do_OPTIONS(self):
            self.send_response(204)
            self._send_cors_headers()
            self.send_header("Content-Length", "0")
            self.send_header("Connection", "close")
            self.end_headers()

        def do_GET(self):
            if self.path in ("/health", "/"):
                body = json.dumps(worker.get_health_status()).encode("utf-8")
                self._send_json(200, body)
                return

            if self.path == "/telemetry":
                cache_len = len(worker.runner.cache._access_times) if hasattr(worker.runner, "cache") else 0
                body = json.dumps({
                    "worker_id": worker.worker_id,
                    "state": worker.state,
                    "concurrency": config.worker_concurrency,
                    "jobs_received": worker.consumer.jobs_received,
                    "jobs_started": worker.jobs_started,
                    "jobs_completed": worker.jobs_completed,
                    "jobs_failed": worker.job_failures,
                    "jobs_rejected": worker.consumer.jobs_rejected,
                    "redis_errors": worker.consumer.redis_errors,
                    "cache_entries": cache_len,
                    "max_cache_entries": config.cache_max_entries,
                    "callback": worker.callback_client.get_telemetry() if worker.callback_client else {},
                    "sandbox": worker.runner.docker_sandbox.get_telemetry() if hasattr(worker.runner, "docker_sandbox") else {},
                }).encode("utf-8")
                self._send_json(200, body)
                return

            self._send_json(404, b'{"error": "Not found"}')

        def do_POST(self):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else ""

            if self.path == "/cancel":
                try:
                    payload = json.loads(body)
                except Exception:
                    self._send_json(400, b'{"error": "Invalid JSON"}')
                    return

                execution_id = payload.get("execution_id") or payload.get("submission_id")
                if not execution_id:
                    self._send_json(400, b'{"error": "Missing execution_id"}')
                    return

                cancelled = job_registry.cancel(execution_id)
                logger.info(f"Cancellation requested for {execution_id}: success={cancelled}")

                resp_body = json.dumps({
                    "status": "ok",
                    "cancelled": cancelled,
                    "execution_id": execution_id
                }).encode("utf-8")
                self._send_json(200, resp_body)
                return

            if self.path == "/execute":
                t_received = datetime.now(timezone.utc).isoformat()
                try:
                    payload = json.loads(body)
                except Exception:
                    self._send_json(400, b'{"error": "Invalid JSON"}')
                    return

                language = payload.get("language", "python")
                source_code = payload.get("source_code") or payload.get("code", "")
                stdin_input = payload.get("stdin_input", "")
                is_custom_run = payload.get("is_custom_run", True)
                execution_id = payload.get("execution_id") or f"exec-{int(time.time()*1000)}"
                mode = payload.get("mode", "RUN" if is_custom_run else "SUBMIT")
                problem_id = payload.get("problem_id")

                # Parse test cases
                raw_cases = payload.get("test_cases")
                if raw_cases and isinstance(raw_cases, list) and len(raw_cases) > 0:
                    test_cases = [
                        TestCaseItem(
                            input=c.get("input", ""),
                            expected_output=c.get("expected_output"),
                            is_sample=c.get("is_sample", False),
                        )
                        for c in raw_cases
                    ]
                elif problem_id and (mode == "SUBMIT" or not is_custom_run):
                    test_cases = worker.fetch_canonical_test_cases(problem_id)
                    if not test_cases:
                        test_cases = [TestCaseItem(input=stdin_input or "", expected_output=None)]
                else:
                    test_cases = [TestCaseItem(input=stdin_input or "", expected_output=None)]

                t_queued = datetime.now(timezone.utc).isoformat()

                future = worker.executor.submit(
                    worker.runner.execute,
                    language=language,
                    source_code=source_code,
                    test_cases=test_cases,
                    is_custom_run=is_custom_run,
                    execution_id=execution_id,
                    received_timestamp=t_received,
                    queued_timestamp=t_queued,
                )

                try:
                    pool_timeout = max(30.0, min(300.0, len(test_cases) * 0.8 + 25.0))
                    result: ExecutionResult = future.result(timeout=pool_timeout)
                except concurrent.futures.TimeoutError:
                    job_registry.cancel(execution_id)
                    result = ExecutionResult(
                        verdict="time_limit_exceeded",
                        stderr_output=f"Worker execution pool timeout after {pool_timeout:.1f}s.",
                        total_test_cases=len(test_cases),
                        telemetry=ExecutionTelemetry(
                            execution_id=execution_id,
                            request_received_at=t_received,
                            job_queued_at=t_queued,
                            total_ms=int(pool_timeout * 1000),
                            cached_compilation=False,
                        )
                    )
                except Exception as err:
                    result = ExecutionResult(
                        verdict="internal_error",
                        stderr_output=f"Worker pool error: {str(err)}",
                        total_test_cases=len(test_cases),
                        telemetry=ExecutionTelemetry(
                            execution_id=execution_id,
                            request_received_at=t_received,
                            job_queued_at=t_queued,
                            total_ms=0,
                            cached_compilation=False,
                        )
                    )

                self._send_json(200, result.model_dump_json().encode("utf-8"))
                return

            self._send_json(404, b'{"error": "Not found"}')

        def log_message(self, format, *args):
            pass

    return JudgeRequestHandler


def main():
    """Main daemon entrypoint for CHAKRIVA Online Judge Worker."""
    worker = JudgeWorker()
    http_port = config.http_port
    http_host = config.http_host

    handler_class = create_http_handler(worker)
    try:
        httpd = ThreadingHTTPServer((http_host, http_port), handler_class)
        logger.info(
            "CHAKRIVA Threaded Judge HTTP Server listening on http://%s:%d (Concurrency: %d)",
            http_host,
            http_port,
            config.worker_concurrency,
        )
        server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        server_thread.start()
    except Exception as e:
        logger.warning("Could not bind Threading HTTP server to port %d: %s", http_port, e)
        httpd = None

    def handle_signal(sig, frame):
        logger.info("Received termination signal (%s). Initiating shutdown...", sig)
        worker.stop()
        if httpd:
            try:
                httpd.shutdown()
            except Exception:
                pass
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    logger.info("Starting CHAKRIVA Online Judge Worker (%s)...", config.worker_id)
    worker.run()


if __name__ == "__main__":
    main()
