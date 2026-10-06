# Production Judge Queue Producer Specification (Phase J.5.2)
## Chakriva Online Judge Platform — Application-Side Queue Publishing Path

**Document Version:** 1.0.0
**Phase:** J.5.2 — Production Judge Queue Producer
**Contract Version:** `"1"` (Aligns with Phase J.5.1 Specification)
**Status:** Implemented & Verified

---

## 1. Producer Architecture Overview

Phase J.5.2 implements the application-side production judge job publishing path within the Chakriva platform. The producer layer bridges the authenticated web tier and the distributed execution workers.

```text
HTTP Client (Browser / API Client)
                 │
                 ▼
SubmissionController (POST /api/v1/submissions)
                 │
                 ▼
SubmissionService (Validation, DB Persistence, Job Construction)
                 │
                 ▼
SubmissionQueueProducer (Atomic Redis Serialization & LPUSH/RPUSH)
                 │
                 ▼ [JSON string conforming to JudgeJob Contract v1]
Redis Queue Key (`verniq:submissions:queue`)
                 │
                 ▼
AWS Judge Worker Consumer (Phase J.5.3 - Deferred)
```

### Core Design Principles
1. **Database as Single Source of Truth:** Every submission is persisted with status `QUEUED` and a unique `judgeJobId` before enqueuing to Redis.
2. **Server-Authoritative Enforcement:** Execution limits (`timeLimitMs`, `memoryLimitMb`), problem versions, and lifecycle status are strictly resolved from server-side configurations and database models—never blindly accepted from user requests.
3. **Zero Secrets in Queues:** No internal callback tokens, master secrets, or administrative credentials ever enter the job payload.
4. **Zero Untrusted Hidden Test Exposure:** Hidden test cases are never embedded in the published queue job; the worker resolves test suites server-authoritatively or via separate authorized channels.

---

## 2. Redis Queue Configuration

The queue producer uses Spring Data Redis (`StringRedisTemplate`) configured with explicit environment overrides and production defaults:

| Property | Default Value | Description |
|---|---|---|
| `verniq.judge.queue-name` | `verniq:submissions:queue` | Canonical Redis List key for incoming execution jobs. |
| `verniq.judge.default-time-limit-ms` | `2000` | Default execution timeout in milliseconds if unconfigured on problem. |
| `verniq.judge.default-memory-limit-mb` | `256` | Default memory limit in megabytes if unconfigured on problem. |
| `spring.data.redis.host` | `localhost` | Redis instance host. |
| `spring.data.redis.port` | `6379` | Redis instance port. |

### Canonical Queue Key Invariant
Exactly one queue namespace is used across the system: `verniq:submissions:queue`. Ad-hoc keys or divergent naming formats are strictly prohibited.

---

## 3. Payload Schema Mapping

The producer constructs a `JudgeJobPayload` serialized into JSON matching the **J.5.1 `JudgeJob` specification** exactly:

| J.5.1 `JudgeJob` Field | Java Type | Source / Derivation | Example |
|---|---|---|---|
| `contractVersion` | `String` | Constant `"1"` | `"1"` |
| `jobId` | `String` | `UUID.randomUUID().toString()` (or reused on retry) | `"f47ac10b-58cc-4372-a567-0e02b2c3d479"` |
| `submissionId` | `String` | Database `submission.getId().toString()` | `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"` |
| `problemId` | `String` | Database `problem.getId().toString()` | `"7c9e6679-7425-40de-944b-e07fc1f90ae7"` |
| `verniqId` | `String` | Database `problem.getVerniqId()` | `"VRQ-000001"` |
| `problemVersion` | `int` | Database `problem.getCurrentVersion()` | `1` |
| `language` | `String` | Lowercase DB language code (`SubmissionLanguage.getDbValue()`) | `"java"`, `"python"`, `"cpp"` |
| `sourceCode` | `String` | Candidate code from `request.sourceCode()` | `"class Solution { ... }"` |
| `mode` | `String` | Validated execution mode (`"RUN"` or `"SUBMIT"`) | `"SUBMIT"` |
| `timeLimitMs` | `int` | Server-authoritative `verniq.judge.default-time-limit-ms` | `2000` |
| `memoryLimitMb` | `int` | Server-authoritative `verniq.judge.default-memory-limit-mb` | `256` |
| `customInput` | `String` | `request.customInput()` if `mode == "RUN"`, else `null` | `"nums = [2,7,11,15], target = 9"` |
| `createdAt` | `String` | ISO-8601 UTC timestamp `Instant.now().toString()` | `"2026-10-06T05:21:00.000Z"` |

### Example Serialized Payload
```json
{
  "contractVersion": "1",
  "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "submissionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "problemId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "verniqId": "VRQ-000001",
  "problemVersion": 1,
  "language": "python",
  "sourceCode": "def twoSum(nums, target):\n    return [0, 1]",
  "mode": "SUBMIT",
  "timeLimitMs": 2000,
  "memoryLimitMb": 256,
  "customInput": null,
  "createdAt": "2026-10-06T05:21:00.000000Z"
}
```

---

## 4. Validation and Error Handling

Before a job payload is accepted or enqueued, `SubmissionService` enforces multi-layer invariants:

1. **Execution Mode Validation:** Only `"RUN"` and `"SUBMIT"` (case-insensitive) are accepted. Default is `"SUBMIT"`. Any unknown mode raises `InvalidRequestException` (HTTP 400).
2. **Problem Publication Status:** Only `is_published = true` / `workflow_status = "published"` problems permit submissions. Submitting against a `draft` problem immediately raises `InvalidRequestException` (HTTP 400).
3. **Source Code Presence:** Non-empty, non-blank check (`StringUtils.hasText`). Blank source code raises `InvalidRequestException` (HTTP 400).
4. **Language Support:** Validated against `SubmissionLanguage` enum. Unsupported languages trigger HTTP 400.
5. **Rate Limiting:** Sliding window token bucket prevents abuse. Rate limit violations trigger HTTP 429 without database persistence or queue mutation.

---

## 5. Idempotency Guarantees

- **Single Canonical Job ID:** Each submission receives a unique UUID `jobId` at database insertion time stored in `submissions.judge_job_id`.
- **Publication Retries:** The method `republishSubmission(UUID submissionId)` guarantees that retrying an enqueue operation **reuses the existing `judgeJobId`**. It does **not** create a new UUID or duplicate submission rows.
- **Worker De-duplication:** Because `jobId` remains constant across retries, downstream workers and result ingestion endpoints can safely de-duplicate repeated delivery attempts.

---

## 6. Hidden Test Protection Guarantees

- **Zero Test Leakage in Queue:** Under no circumstances are canonical hidden test inputs or expected outputs included in the Redis `JudgeJob` payload.
- **RUN Mode Isolation:** In `RUN` mode, only candidate code and `customInput` (or sample inputs provided by the user) are passed.
- **SUBMIT Mode Worker Authorization:** In `SUBMIT` mode, `customInput` is strictly serialized as `null`. Canonical tests remain in the backend store or authorized worker test suites.

---

## 7. Secret Handling Policy

- **No Secrets in Payloads:** Internal callback authentication tokens, database passwords, and API secrets are never placed in Redis messages.
- **Clean Environment Variables:** All secrets and credentials are read strictly from environment variables (`VERNIQ_JUDGE_INTERNAL_SECRET`, `SPRING_DATA_REDIS_PASSWORD`) via Spring configuration.

---

## 8. Logging Policy & Zero-Leak Auditing

- **Safe toString Implementation:** `JudgeJobPayload.toString()` explicitly redacts `sourceCode` and `customInput`, logging only code length (e.g. `<REDACTED len=124>`).
- **Structured MDC Context:** All producer logs bind `submissionId` and `judgeJobId` to SLF4J MDC context.
- **Queue Timing Telemetry:** `SubmissionQueueProducer` measures Redis serialization and queue write latency (`enqueueTimeMs`), logging queue depth and latency on every push.

---

## 9. Redis Failure Modes and Mitigations

| Failure Scenario | Producer Behavior | Recovery Mechanism |
|---|---|---|
| **Redis Connection Down / Refused** | `SubmissionQueueProducer` catches `RedisConnectionFailureException` / `QueryTimeoutException`, logs structured ERROR with `submissionId` and `jobId`, and marks or throws gracefully. | Submission remains in DB with status `QUEUED`. Background `SubmissionRecoveryService` detects stalled `QUEUED` submissions and initiates automated republishing via `republishSubmission`. |
| **Redis Write Timeout** | Timeout captured without blocking caller indefinitely. | Redis client timeout configured with short thresholds (default 2s) to protect web tier threads. |
| **Redis Queue Overflow** | Queue length monitored via `opsForList().size()`. Alerting logged when depth exceeds warning thresholds. | Queue consumer autoscaling in Phase J.5.3. |

---

## 10. Test Verification Summary

The producer path has been verified with 100% test pass rate across both unit and full-stack integration suites:

1. **`ProductionJudgeQueueProducerTest` (14 Unit Tests):**
   - Correct JSON serialization matching J.5.1 contract.
   - Exact `verniq:submissions:queue` key routing.
   - Server-authoritative limits (`timeLimitMs`, `memoryLimitMb`) correctly populated.
   - Valid `RUN` and `SUBMIT` modes.
   - Blank code and invalid mode rejections.
   - Draft problem submission rejection (HTTP 400).
   - `JudgeJobPayload.toString()` redaction verification.
   - `jobId` idempotency reuse on retry.
   - Null custom input in submit mode.
   - Database persistence preceding queue push.
2. **`SubmissionControllerTest` (10 Integration Tests):** All 10 Spring Boot MockMvc tests pass with 0 errors.
3. **Full Backend Test Suite:** 95/95 tests PASS across all modules (`mvnw.cmd test`).
4. **Python Judge Contract Tests:** 19/19 tests PASS (`python tests/test_judge_contracts.py`).

---

## 11. Migration & Backward Compatibility Note

- `SubmissionQueueProducer` retains its legacy 3-argument constructor (`StringRedisTemplate`, `ObjectMapper`, `SubmissionMetrics`) while introducing the 4-argument `@Autowired` constructor accepting `@Value("${verniq.judge.queue-name}")`.
- `CreateSubmissionRequest` retains its 3-argument constructor (`problemId`, `language`, `sourceCode`) by delegating to canonical `(problemId, language, sourceCode, "SUBMIT", null)`.
- Existing database tables require no schema migration; all J.5.2 fields map to existing columns (`submissions.judge_job_id`, `submissions.stdin_input`, `submissions.custom_run`, `submissions.problem_version`).

---

## 12. Operational Runbook

### 12.1 Inspecting Queue Depth
To inspect the number of pending jobs in Redis:
```bash
redis-cli LLEN verniq:submissions:queue
```

To inspect the next job in line without removing it:
```bash
redis-cli LRANGE verniq:submissions:queue 0 0
```

### 12.2 Inspecting a Specific Job Payload
```bash
# Pretty-print the oldest pending job
redis-cli LINDEX verniq:submissions:queue -1 | jq .
```

### 12.3 Debugging Failed / Stalled Submissions
1. Identify stalled submissions in PostgreSQL:
   ```sql
   SELECT id, user_id, problem_id, judge_job_id, status, queued_at
   FROM submissions
   WHERE status = 'QUEUED' AND queued_at < NOW() - INTERVAL '5 minutes';
   ```
2. Check backend application logs for the specific `judgeJobId`:
   ```bash
   grep "judgeJobId=<JOB_UUID>" /var/log/verniq/verniq-api.log
   ```

### 12.4 Republishing Stalled Submissions
To programmatically republish stalled jobs with the existing `jobId`:
```java
// Invoke via administrative service or scheduled task:
submissionService.republishSubmission(stalledSubmissionId);
```
Or execute manual Redis push using the captured database record if needed.
