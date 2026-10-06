# Production Judge Worker Consumer Specification (Phase J.5.3)
## CHAKRIVA Online Judge Platform — Redis Job Consumer & Worker Lifecycle

**Document Version:** 1.0.0
**Phase:** J.5.3 — Production Judge Worker Consumer
**Contract Version:** `"1"` (Aligns with Phase J.5.1 and J.5.2 Specifications)
**Status:** Implemented & Verified

---

## 1. Architecture Overview

Phase J.5.3 transitions the Python judge worker from the legacy Supabase pending-submission polling transport to the production Redis job-consumer transport established in Phase J.5.2.

```text
Spring Boot Application Plane
             │
             ▼ [RPUSH verniq:submissions:queue]
       Redis Queue Key
             │
             ▼ [BLPOP (blocking consumer)]
    Python Judge Worker (RedisConsumer)
             │
             ▼ [Parse & Validate]
     JudgeJob Contract (v1)
             │
             ▼
   Existing Judge Engine (SandboxRunner / gVisor)
             │
             ▼
       ExecutionResult
             │
             ▼ [Map to Versioned Schema]
    JudgeResult Contract (v1)
             │
             ▼ (Kept in-memory; Callback in J.5.4)
[Spring Boot Callback deferred to J.5.4]
```

### Key Architectural Invariants
1. **Single Production Job Transport:** Redis is the sole production job transport. The worker does **not** simultaneously poll Supabase for pending submissions.
2. **Reuse of Verified Execution Engine:** `SandboxRunner`, language profiles, comparator, `CompilationCache`, and `ActiveJobRegistry` remain untouched as the core execution engine.
3. **Decoupled Contracts:** Wire transport uses the versioned Pydantic contracts (`JudgeJob` and `JudgeResult`), decoupling the external queue representation from internal sandbox mechanics.
4. **Zero-Trust & Anti-Leak:** Neither source code nor canonical hidden test data is logged or transmitted across untrusted channels.

---

## 2. Redis Queue Configuration

The consumer connects to Redis using `redis-py` configured with clean environment overrides and production-grade defaults:

| Setting / Property | Default Value | Description |
|---|---|---|
| `JUDGE_QUEUE_NAME` / `REDIS_QUEUE_NAME` | `verniq:submissions:queue` | Canonical Redis LIST key matching J.5.2 producer. |
| `REDIS_URL` | `None` | Preferred connection URI format (e.g. `redis://localhost:6379/0`). |
| `REDIS_HOST` | `localhost` | Fallback explicit host. |
| `REDIS_PORT` | `6379` | Fallback explicit port. |
| `REDIS_DB` | `0` | Fallback database index. |
| `REDIS_SOCKET_TIMEOUT` | `5.0` s | Network socket I/O timeout. |
| `REDIS_CONNECT_TIMEOUT` | `5.0` s | TCP socket connection timeout. |
| `BLPOP_TIMEOUT` | `2` s | Blocking timeout per BLPOP invocation. |
| `WORKER_CONCURRENCY` | `1` | Concurrency limit (optimized for t3.micro). |

### Security Invariant
Credentials (passwords, auth tokens) are read strictly from environment variables and are **never** hardcoded or logged.

---

## 3. Job Consumption Semantics (BLPOP)

Consumption is implemented in `RedisConsumer.pop_raw_job()` using blocking list pop:

```python
# RedisConsumer BLPOP implementation
result = self.client.blpop(self.queue_name, timeout=self.blpop_timeout)
```

### Critical Operational Characteristics
- **No Busy-Spin:** The consumer thread blocks at the Redis server for up to `blpop_timeout` seconds. If no job is present, it wakes up, verifies the worker's running state, and repeats.
- **Immediate Message Removal:** `BLPOP` removes the job from the Redis list **immediately** upon delivery.
- **No Durable Acknowledgement in J.5.3:** Phase J.5.3 does not implement leases, visibility timeouts, or secondary processing queues.
- **Crash Semantics:** Because `BLPOP` consumes messages eagerly, a process crash or hardware power outage during execution will result in an unrecovered message from Redis's perspective. (Platform-level recovery is provided by Spring Boot's `SubmissionRecoveryService` in Phase H).

---

## 4. Job Validation & Error Isolation

Every message popped from Redis passes through `RedisConsumer.parse_job()` before execution:

1. **JSON Decoding:** Malformed JSON strings are rejected without crashing.
2. **Contract Version Verification:** Strictly requires `contractVersion == "1"`. Any other version is rejected safely.
3. **Pydantic Validation (`JudgeJob`):**
   - Validates UUID lengths, required fields (`jobId`, `submissionId`, `language`, `sourceCode`).
   - Rejects blank source code (`sourceCode.strip() == ""`).
   - Normalizes supported languages (`c++` $\to$ `cpp`, `py` $\to$ `python`, etc.).
   - Enforces execution mode (`RUN` vs `SUBMIT`).
   - Validates server-authoritative time and memory limits.
   - Forbids unknown/extra fields (`extra="forbid"`).
4. **Non-Crashing Isolation:** Invalid jobs increment `jobs_rejected` telemetry and are safely dropped; the worker daemon remains alive and continues processing subsequent jobs.

---

## 5. Worker Concurrency & Hardware Sizing

- **Default Concurrency:** `WORKER_CONCURRENCY = 1`.
- **Target Hardware:** AWS EC2 `t3.micro` (2 vCPU, 1 GiB RAM).
- **Rationale:** Candidate compilation and multi-language sandboxing are memory-intensive (Java runtime, GCC compiler). Single-threaded concurrency ensures deterministic resource utilization without triggering the Linux OOM killer.
- **Configurability:** Operators can scale concurrency via the `WORKER_CONCURRENCY` environment variable on larger instance types.

---

## 6. Worker Lifecycle & Graceful Shutdown

The worker transitions through explicit, observable states:

```text
STARTING ──► READY ──► WAITING_FOR_JOB ◄──► PROCESSING
                             │
                             ▼
                          STOPPING ──► STOPPED
```

### Signal Handling (SIGTERM & SIGINT)
Upon receiving termination signals:
1. `worker.stop()` is invoked.
2. `worker.running` is set to `False`; state becomes `STOPPING`.
3. Active `BLPOP` blocks are interrupted on next timeout tick.
4. Active execution completes when practical.
5. Redis connection is closed cleanly (`client.close()`).
6. ThreadPoolExecutor is shut down.
7. Worker state transitions to `STOPPED`.

---

## 7. Redis Connection Resilience & Backoff

`RedisConsumer` handles disconnections, timeouts, and network resets gracefully:
- **Catches Specific Exceptions:** `redis.RedisError`, `redis.ConnectionError`, `redis.TimeoutError`, `OSError`.
- **Bounded Exponential Backoff:** Initial delay of 1.0s, doubling on consecutive failures up to 10.0s.
- **Safe Reconnection:** Closes old socket, re-instantiates connection, and resets backoff upon successful `ping()`.
- **Telemetry Counter:** Increments `redis_errors` counter on each failure event.

---

## 8. Mode Handling & Canonical Test Security

| Mode | Input Source | Test Cases Used | Test Leakage Safeguard |
|---|---|---|---|
| `RUN` | `job.customInput` | Single ephemeral test case (`is_sample=True`) | User-supplied data only. |
| `SUBMIT` | Server-authoritative | Canonical test suite resolved server-side via Supabase / PostgREST cache | Hidden tests are **never** placed in Redis. In `JudgeResult.firstFailedTest`, `expectedOutput` is strictly redacted (`None`) when `isSample=False`. |

---

## 9. Telemetry & Health Monitoring

The worker HTTP server exposes operational metrics:

### `GET /health`
```json
{
  "status": "healthy",
  "worker": "judge-worker-1",
  "state": "WAITING_FOR_JOB",
  "connected_to_redis": true,
  "current_job_id": null,
  "jobs_received": 42,
  "jobs_started": 42,
  "jobs_completed": 41,
  "jobs_failed": 1,
  "jobs_rejected": 0,
  "redis_errors": 0,
  "concurrency": 1,
  "cache_enabled": true,
  "last_job_received_at": "2026-10-06T05:30:00Z",
  "last_job_completed_at": "2026-10-06T05:30:01Z",
  "time": "2026-10-06T05:30:15Z"
}
```

---

## 10. What Phase J.5.3 Does NOT Implement

To maintain strict phase boundaries:
- **Docker-per-submission execution:** Sandboxing remains on the verified in-process `SandboxRunner`. Docker/gVisor containerization is scheduled for Phase J.6.
- **Spring Boot authenticated callback:** `JudgeResult` is constructed and retained in-memory. Callback HTTP delivery and authentication are scheduled for Phase J.5.4.
- **Database schema changes:** No database modifications.
- **Autoscaling / Kubernetes:** Single-node worker lifecycle.

---

## 11. Test Verification Summary

| Test Module | Tests | Result | Coverage |
|---|---|---|---|
| `test_redis_consumer.py` | 20 | **20/20 PASS** | Full coverage of all 20 acceptance criteria from Section 25. |
| `test_judge_contracts.py` | 19 | **19/19 PASS** | J.5.1 canonical contract serialization and validation. |
| `test_judge_performance.py`| 10 | **10/10 PASS** | Multi-language compilation caching and sandbox execution. |
| Spring Boot Backend | 95 | **95/95 PASS** | Complete application plane and queue producer verification. |
