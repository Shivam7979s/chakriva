# Production Judge Result Callback (Phase J.5.4)

## Overview

Phase J.5.4 connects the production Python Judge Worker to the Chakriva / Verniq Spring Boot application plane through an authenticated internal HTTP/HTTPS callback. Completed `JudgeResult` objects (strictly conforming to the J.5.1 canonical schema) are persisted safely, transactionally, and idempotently into the database submissions system.

---

## 1. Architecture

```text
Browser
   ↓
Spring Boot API
   ↓
Create Submission (QUEUED)
   ↓
Redis Queue (verniq:submissions:queue)
   ↓
Python Judge Worker (BLPOP)
   ↓
Sandbox Execution Engine
   ↓
Canonical JudgeResult (contractVersion = "1")
   ↓
Authenticated Internal Callback (POST /api/v1/internal/judge/results)
   ↓
Spring Boot Ingestion Controller & Service
   ↓
Transactional Result Validation & Idempotency Check
   ↓
Database Submission Transition & User Progress
   ↓
Frontend Polling (Existing /api/v1/submissions/{id})
```

### Critical Layer Separation
1. **Application Plane Isolation:** The browser never calls the internal callback endpoint. The endpoint is worker-to-application only.
2. **Execution Engine Independence:** The `SandboxRunner`, language profiles, comparator, and test harness contain zero HTTP or networking logic.
3. **Dedicated Transport Client:** Callback transmission is isolated inside `JudgeCallbackClient` (`backend/judge/src/callback/client.py`).

---

## 2. Authentication & Authorization

### Canonical Internal Secret Header
- Service-to-service communication requires the HTTP header:
  ```http
  X-Internal-Secret: <VERNIQ_JUDGE_INTERNAL_SECRET>
  ```
- **Configuration Properties:**
  - Spring Boot: `verniq.judge.internal-secret` and `app.judge.internal-secret` mapped from environment variable `VERNIQ_JUDGE_INTERNAL_SECRET`.
  - Python Judge: `VERNIQ_JUDGE_INTERNAL_SECRET` (fallback: `INTERNAL_API_SECRET`).
- **Timing Attack Resistance:**
  Spring Boot evaluates the header using constant-time comparison via `MessageDigest.isEqual`:
  ```java
  MessageDigest.isEqual(
      secretHeader.trim().getBytes(StandardCharsets.UTF_8),
      internalSecret.getBytes(StandardCharsets.UTF_8)
  )
  ```
- **Security Rejections:**
  - Missing header → `403 Forbidden` (`FORBIDDEN`)
  - Blank or whitespace header → `403 Forbidden` (`FORBIDDEN`)
  - Invalid / mismatched secret → `403 Forbidden` (`FORBIDDEN`)
  - Regular user JWT → Cannot bypass internal secret; non-internal callers receive `403 Forbidden`.

---

## 3. Callback Endpoint Specification

- **Method & Path:** `POST /api/v1/internal/judge/results`
- **Request Headers:**
  - `Content-Type: application/json; charset=utf-8`
  - `X-Internal-Secret: <secret>`
- **Payload Schema:** Version 1 `JudgeResult` contract:
  ```json
  {
    "contractVersion": "1",
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "submissionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "workerId": "aws-judge-worker-ap-south-1a",
    "status": "COMPLETED",
    "verdict": "ACCEPTED",
    "runtimeMs": 42,
    "memoryKb": 2048,
    "testCasesPassed": 15,
    "totalTestCases": 15,
    "firstFailedTest": null,
    "failedTestIndex": null,
    "compileOutput": null,
    "stderrOutput": null,
    "stdoutOutput": null,
    "errorMessage": null,
    "telemetry": {
      "executionMs": 42,
      "totalMs": 55
    },
    "completedAt": "2026-10-06T10:00:00Z"
  }
  ```

---

## 4. Idempotency & Stale Callback Protection

### Idempotency Behavior
Network retries, worker restarts, or delayed TCP ACKs can cause identical callback payloads to arrive more than once.
- When an already-terminal submission receives an **identical** callback (`submission.getStatus() == finalStatus`):
  - Ingestion immediately logs an idempotent event.
  - Returns `200 OK` with the existing submission detail DTO.
  - `UserProgressService` is **not** called a second time.
  - Metrics are not duplicated.

### Conflict Rejection
- If a subsequent callback attempts to overwrite an already-terminal submission with a **conflicting** verdict (e.g. `ACCEPTED` overwritten by `WRONG_ANSWER`):
  - Spring Boot safely rejects the attempt with `409 Conflict` (`CONFLICT`).
- If an invalid state machine transition is attempted (e.g. from `CANCELLED` to `ACCEPTED`):
  - Rejected with `409 Conflict`.

### Stale Job Identity Verification
- The submission entity in PostgreSQL retains its authoritative `judgeJobId`.
- When a callback arrives:
  - If `submission.getJudgeJobId()` is present and does not equal `callback.jobId()`:
    - Ingestion rejects the callback with `409 Conflict` (`Job ID mismatch`).
    - Stale or mismatched jobs can never corrupt a submission.

---

## 5. Server-Authoritative Fields & Anti-Leak Security

### Immutability of Authoritative Data
The database submission record is the absolute source of truth for:
- `userId` (ownership)
- `problem` & `problemVersion`
- `sourceCode`
- `createdAt`

The callback endpoint only updates execution outcome fields (`status`, `runtimeMs`, `memoryKb`, `testCasesPassed`, `totalTestCases`, `failedTestIndex`, `compileOutput`, `stderrOutput`, `errorMessage`, `score`, `completedAt`). It cannot overwrite source code or reassign submission ownership.

### Hidden-Test Data Protection
- Before callback serialization, the Python judge enforces the J.5.1 anti-leak rules:
  - For hidden test cases (`isSample == false`), `expectedOutput` is strictly set to `null` / `None`.
  - Canonical hidden test inputs and expected outputs are never transmitted.
- Spring Boot confirms that no expected outputs for hidden test cases are stored in database error fields or exposed to clients.
- `sourceCode` is never included in the `JudgeResult` schema.

---

## 6. Python Worker Callback Client & Retry Policy

### Dedicated Client (`backend/judge/src/callback/client.py`)
- Standard library HTTP (`urllib.request`) implementation with zero external networking dependencies.
- **Fail-Fast Configuration:**
  - If `JUDGE_CALLBACK_URL` is configured but `VERNIQ_JUDGE_INTERNAL_SECRET` is missing, initialization fails immediately with `ValueError`.
  - If `JUDGE_CALLBACK_URL` is absent/empty, callback delivery is disabled and results are kept safely in worker memory.

### Bounded Exponential Backoff
- **Maximum Attempts:** 4
- **Backoff Schedule:**
  - Attempt 1: Immediate (0s delay)
  - Attempt 2: 1.0s delay
  - Attempt 3: 2.0s delay
  - Attempt 4: 4.0s delay
- **Retry Conditions:**
  - Retries on transient transport failures: `URLError`, `TimeoutError`, socket errors, HTTP `5xx` (500, 502, 503, 504).
- **Fail-Fast Without Retry:**
  - `401 Unauthorized` / `403 Forbidden` → Auth failure, retry aborted immediately.
  - `400 Bad Request` / `422 Unprocessable Entity` / `409 Conflict` → Validation/conflict error, retry aborted immediately.

### Critical Safety Invariant: Failure Does NOT Re-Run Code
- If all 4 callback delivery attempts fail:
  - The worker **never** crashes.
  - The worker **never** executes the candidate's code again.
  - The delivery failure is logged and recorded in telemetry.
  - The worker resets its state cleanly to `WAITING_FOR_JOB` and continues processing subsequent jobs from Redis.

---

## 7. Logging & Telemetry Hygiene

### Zero Secrets / Zero Code Logging
- Structured callback logs include:
  `worker_id`, `job_id`, `submission_id`, `endpoint` (sanitized host/path without query strings or auth), `attempt`, `status`, `duration_ms`.
- Secrets (`X-Internal-Secret`, `VERNIQ_JUDGE_INTERNAL_SECRET`), `sourceCode`, JWTs, and canonical hidden test data are **never** logged.

### Telemetry Counters
The callback client maintains granular counters exposed on `/telemetry` and `/health`:
- `callback_configured`: boolean
- `callback_attempts`: total HTTP requests dispatched
- `callback_success`: total successful HTTP 2xx deliveries
- `callback_failures`: total failed deliveries after exhausting retries or fatal status
- `callback_retries`: total backoff retry attempts
- `callback_auth_failures`: total 401/403 authorization failures
- `callback_validation_failures`: total 400/422/409 payload or conflict rejections

---

## 8. Limitations & Future Reliability Work

> [!IMPORTANT]
> **Phase J.5.4 Delivery Semantics:**
> J.5.4 provides at-most-once to at-least-once bounded HTTP delivery with server-side idempotency.
> It does **NOT** provide durable result recovery if the worker machine dies or loses power after sandbox execution completes but before successful callback delivery.

### Future Reliability Roadmap
1. **Durable Local Result Outbox:** Persisting completed `JudgeResult` JSON payloads to a local durable disk queue before HTTP delivery.
2. **Dead-Letter Queue (DLQ):** Moving persistently un-callbackable jobs to a dead-letter queue for operator inspection.
3. **Periodic Reconciliation Scanner:** A background Spring worker auditing long-pending `PROCESSING` submissions and querying judge status.
