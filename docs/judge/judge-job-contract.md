# Production Judge Job Contract (Version 1)
## Chakriva Online Judge Platform — Phase J.5.1 Specification

**Document Version:** 1.0.0
**Contract Version:** `"1"`
**Status:** Canonical Design & Contract Specification
**Architecture Plane:** Chakriva Application Plane $\leftrightarrow$ AWS Judge Worker Execution Boundary

---

## 1. Purpose

This document defines the formal, versioned contract governing communication between the **Chakriva Application Plane** (Spring Boot core services) and the **AWS Judge Worker** (Python execution daemon).

The contract enforces:
1. **Zero-Trust Separation:** Untrusted candidate source code and user inputs are strictly isolated from the backend plane.
2. **Deterministic Payload Specifications:** Explicit typed schemas using Pydantic models for job ingestion (`JudgeJob`) and verdict reporting (`JudgeResult`).
3. **Anti-Leak Security Invariants:** Hidden test inputs and expected outputs are never accessible to the browser or transmitted in public payloads.
4. **Transport Idempotency:** Every execution job carries an authoritative `jobId` that uniquely identifies the execution attempt across queuing, execution, and callback retries.

---

## 2. Architecture Position

The contract establishes a clean boundary sitting strictly above the execution engine:

```text
Chakriva Application Plane (Spring Boot)
                  │
                  ▼
         Judge Job Transport (Queue / SQS / Redis)
                  │  [JudgeJob Contract v1]
                  ▼
         AWS Judge Worker (Worker Daemon)
                  │
                  ▼
       Existing Execution Engine (SandboxRunner / gVisor)
                  │
                  ▼
          ExecutionResult (Internal Runtime Model)
                  │
                  ▼
         AWS Judge Worker Serialization
                  │  [JudgeResult Contract v1]
                  ▼
         Result Transport (Callback HTTP / SQS)
                  │
                  ▼
Chakriva Application Plane (Persistence & User State Engine)
```

The contract models (`JudgeJob`, `JudgeResult`, `FirstFailedTest`, `JobTelemetry`) decouple the transport wire format from the internal sandbox execution engine (`ExecutionResult`, `TestCaseItem`, `FailedTestCaseInfo`), guaranteeing that internal sandbox implementations can evolve without breaking external transport protocols.

---

## 3. JudgeJob Contract Schema

### 3.1 Field Specification

| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `contractVersion` | `string` | **Yes** | `"1"` | Must strictly equal `"1"`. Unversioned payloads are rejected. |
| `jobId` | `string` | **Yes** | — | Unique UUID/string identifying this execution job. Acts as the transport idempotency key. |
| `submissionId` | `string` | **Yes** | — | Chakriva submission entity identifier in database. |
| `problemId` | `string` | Conditional | `null` | Internal problem UUID. **Required for `SUBMIT` mode**, optional for `RUN` mode. |
| `problemVerniqId` | `string` | No | `null` | Public problem identifier (e.g. `VRQ-000001`). |
| `problemVersion` | `integer` | No | `null` | Immutable problem revision number when submission was created. |
| `language` | `string` | **Yes** | — | Normalized language: `cpp`, `java`, `python`, `typescript`, `go`, `rust`. |
| `sourceCode` | `string` | **Yes** | — | Candidate's submitted code (max 256KB). Never logged in server output. |
| `mode` | `string` | **Yes** | `"SUBMIT"` | Execution mode: `RUN` or `SUBMIT`. |
| `timeLimitMs` | `integer` | No | `2000` | Authoritative CPU timeout in milliseconds ($100 \le t \le 15000$). |
| `memoryLimitMb` | `integer` | No | `256` | Authoritative RAM cap in megabytes ($16 \le m \le 1024$). |
| `customInput` | `string` | No | `null` | Ad-hoc test input for `RUN` mode. Ignored in `SUBMIT` mode. |
| `createdAt` | `string` | No | Current UTC | ISO-8601 UTC timestamp of creation. |

### 3.2 Security Validation Rules

- **Strict Schema Enforcement (`extra="forbid"`):** Any unexpected or injected fields (e.g., `docker_args`, `privileged`, `secret_key`, `host_path`) immediately trigger a validation error.
- **Source Code Redaction:** String and `repr` representations of `JudgeJob` redact `sourceCode` to `<REDACTED len=...>` to prevent accidental leakage into centralized logging systems.
- **Authoritative Limits:** Time and memory limits are server-determined; workers do not trust arbitrary client-specified execution limits.

---

## 4. JudgeResult Contract Schema

### 4.1 Field Specification

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `contractVersion` | `string` | **Yes** | Must strictly equal `"1"`. |
| `jobId` | `string` | **Yes** | Correlates directly with the `JudgeJob.jobId`. |
| `submissionId` | `string` | **Yes** | Correlates with `JudgeJob.submissionId`. |
| `workerId` | `string` | **Yes** | Hostname or node identifier of the executing AWS worker. |
| `status` | `string` | **Yes** | Transport/execution state: `COMPLETED`, `FAILED`, or `INTERNAL_ERROR`. |
| `verdict` | `string` | **Yes** | Evaluation verdict: `ACCEPTED`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, `COMPILATION_ERROR`, `RUNTIME_ERROR`, `CANCELLED`, `INTERNAL_ERROR`. |
| `runtimeMs` | `integer` | **Yes** | Maximum execution runtime across test cases in milliseconds. |
| `memoryKb` | `integer` | **Yes** | Peak resident set size memory in kilobytes. |
| `testCasesPassed` | `integer` | **Yes** | Number of test cases successfully passed. |
| `totalTestCases` | `integer` | **Yes** | Total number of test cases evaluated. |
| `firstFailedTest` | `object` | No | Diagnostic details for first non-passing test case (see §4.2). |
| `compileOutput` | `string` | No | Compiler standard output and error (sanitized). |
| `stderrOutput` | `string` | No | Runtime error diagnostics. |
| `stdoutOutput` | `string` | No | Standard output from execution (for sample runs). |
| `telemetry` | `object` | No | Structured timing telemetry (see §4.3). |
| `completedAt` | `string` | **Yes** | ISO-8601 UTC timestamp of execution completion. |

### 4.2 FirstFailedTest Schema

```json
{
  "testNumber": 3,
  "actualOutput": "5",
  "expectedOutput": null,
  "failureType": "WRONG_ANSWER",
  "errorMessage": null,
  "isSample": false
}
```

- `testNumber`: 1-based test case index.
- `actualOutput`: Truncated stdout produced by user code.
- `expectedOutput`: **Strictly `null` for canonical hidden tests (`isSample: false`)**. Populated only when `isSample: true`.
- `failureType`: Categorization (e.g., `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`).
- `errorMessage`: Sanitized runtime exception message if applicable.
- `isSample`: Boolean indicating whether the failed test was a public sample test.

### 4.3 JobTelemetry Schema

Granular lifecycle tracing without exposing secrets or code:
- `executionId`, `requestReceivedAt`, `jobQueuedAt`, `workerAcquiredAt`, `sandboxCreatedAt`
- `compileStartedAt`, `compileFinishedAt`, `executionStartedAt`, `executionFinishedAt`
- `resultCollectedAt`, `persistenceFinishedAt`, `responseSentAt`
- `queueMs`, `workerAcquisitionMs`, `sandboxStartupMs`, `compileMs`, `executionMs`, `resultMs`, `persistenceMs`, `totalMs`
- `cachedCompilation`: Boolean flag indicating if compiler cache was hit.

---

## 5. RUN vs. SUBMIT Semantics

| Dimension | `RUN` Mode | `SUBMIT` Mode |
| :--- | :--- | :--- |
| **Purpose** | Fast interactive feedback during problem solving. | Formal evaluation for roadmap and problem completion. |
| **Test Suite** | Only public sample tests or user's `customInput`. | Authoritative canonical test suite (visible + hidden tests). |
| **Hidden Test Access** | **Strictly Forbidden.** Worker never loads hidden tests. | Authoritative server-side evaluation. |
| **Expected Output Exposure** | Permitted for public sample tests. | **Strictly Suppressed** for all hidden test cases. |
| **Progress Mutation** | Does NOT alter `user_problem_progress` or stats. | Authoritatively updates `user_problem_progress` and analytics. |
| **Problem ID Requirement** | Optional (supports standalone scratchpad code). | **Mandatory** (`problemId` must resolve to canonical catalog). |

---

## 6. Hidden-Test Security Invariants

1. **Zero Client Ingestion:** The client browser never transmits, receives, or specifies canonical hidden tests.
2. **Zero Transport Leakage:** The `JudgeJob` payload does **not** contain hidden tests; the worker retrieves canonical test cases from server-authoritative storage using the trusted `problemId` and `problemVersion`.
3. **Anti-Leak Result Sanitization:** In `FirstFailedTest`, the field `expectedOutput` is set to `null` whenever `isSample == false`.
4. **Diagnostic Sanitization:** All compiler diagnostics and runtime stderr strings are sanitized to strip host environment paths (e.g. `/home/ubuntu/...`, `/tmp/...`).

---

## 7. Transport Idempotency & Deduplication

1. **Identity Guarantee:** `jobId` serves as the unique idempotency key across the message queue and result transport.
2. **Duplicate Delivery Safety:** If an identical `jobId` is dequeued multiple times by AWS workers:
   - Workers can check local or cache state to avoid duplicate execution.
   - The result callback to the Chakriva Application Plane must process duplicate callbacks idempotently without corrupting submission status, analytics, or user roadmap progression.
3. **State Monotonicity:** A submission transitioned to terminal state (`ACCEPTED`, `WRONG_ANSWER`, etc.) cannot be regressed by out-of-order or duplicate messages.

---

## 8. Versioning Rules

- The canonical contract version is explicitly declared via `contractVersion: "1"`.
- All fields introduced in minor updates must be optional or backwards-compatible.
- Any breaking change (field renaming, type changes, semantics alterations) requires incrementing `contractVersion` to `"2"`.
- Workers and application consumers reject payloads with unrecognized `contractVersion` values with `HTTP 400 Bad Request` or validation error.

---

## 9. Mapping to Internal ExecutionResult

The `JudgeResult` contract sits above the internal `ExecutionResult` model:

```python
# Internal engine executes sandbox run
exec_res: ExecutionResult = runner.execute(...)

# Clean decoupled translation into production contract
judge_result: JudgeResult = JudgeResult.from_execution_result(
    job_id=job.jobId,
    submission_id=job.submissionId,
    worker_id=config.worker_id,
    exec_res=exec_res,
)
```

The factory method `JudgeResult.from_execution_result`:
- Separates transport status (`COMPLETED`, `FAILED`, `INTERNAL_ERROR`) from verdict (`ACCEPTED`, `WRONG_ANSWER`, etc.).
- Automatically enforces the anti-leak rule on `FirstFailedTest`.
- Translates `ExecutionTelemetry` timings without exposing source code.

---

## 10. Future Transport Expectations

In upcoming phases:
- **J.5.2 (Queue Producer):** Chakriva Spring Boot serializes `JudgeJob` to SQS or Redis.
- **J.5.3 (AWS Worker Consumer):** Distributed worker pool validates and consumes `JudgeJob`.
- **J.5.4 (Authenticated Callback):** Worker posts `JudgeResult` to internal authenticated callback endpoint.
- **J.5.5 (Idempotency Storage):** Deduplication tables track `jobId` processing state.

---

## 11. Example JSON Payloads

### Example A: RUN Job (Sample Test / Custom Input)

```json
{
  "contractVersion": "1",
  "jobId": "job-run-91827364-5a6b",
  "submissionId": "sub-run-91827364-5a6b",
  "problemId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "problemVerniqId": "VRQ-000001",
  "problemVersion": 1,
  "language": "python",
  "sourceCode": "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        seen = {}\n        for i, n in enumerate(nums):\n            diff = target - n\n            if diff in seen:\n                return [seen[diff], i]\n            seen[n] = i\n        return []\n",
  "mode": "RUN",
  "timeLimitMs": 2000,
  "memoryLimitMb": 256,
  "customInput": "nums = [2, 7, 11, 15], target = 9",
  "createdAt": "2026-10-06T04:30:00.000000Z"
}
```

### Example B: SUBMIT Job (Authoritative Evaluation)

```json
{
  "contractVersion": "1",
  "jobId": "job-submit-77889900-1122",
  "submissionId": "sub-submit-77889900-1122",
  "problemId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "problemVerniqId": "VRQ-000001",
  "problemVersion": 1,
  "language": "java",
  "sourceCode": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        java.util.Map<Integer, Integer> map = new java.util.HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int comp = target - nums[i];\n            if (map.containsKey(comp)) return new int[]{map.get(comp), i};\n            map.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}\n",
  "mode": "SUBMIT",
  "timeLimitMs": 2000,
  "memoryLimitMb": 256,
  "customInput": null,
  "createdAt": "2026-10-06T04:30:15.000000Z"
}
```

### Example C: ACCEPTED Result

```json
{
  "contractVersion": "1",
  "jobId": "job-submit-77889900-1122",
  "submissionId": "sub-submit-77889900-1122",
  "workerId": "aws-judge-worker-ap-south-1a",
  "status": "COMPLETED",
  "verdict": "ACCEPTED",
  "runtimeMs": 32,
  "memoryKb": 16420,
  "testCasesPassed": 24,
  "totalTestCases": 24,
  "firstFailedTest": null,
  "compileOutput": null,
  "stderrOutput": null,
  "stdoutOutput": null,
  "telemetry": {
    "executionId": "sub-submit-77889900-1122",
    "requestReceivedAt": "2026-10-06T04:30:15.100000Z",
    "jobQueuedAt": "2026-10-06T04:30:15.105000Z",
    "workerAcquiredAt": "2026-10-06T04:30:15.120000Z",
    "sandboxCreatedAt": "2026-10-06T04:30:15.130000Z",
    "compileStartedAt": "2026-10-06T04:30:15.135000Z",
    "compileFinishedAt": "2026-10-06T04:30:15.225000Z",
    "executionStartedAt": "2026-10-06T04:30:15.230000Z",
    "executionFinishedAt": "2026-10-06T04:30:15.262000Z",
    "resultCollectedAt": "2026-10-06T04:30:15.265000Z",
    "persistenceFinishedAt": null,
    "responseSentAt": null,
    "queueMs": 15,
    "workerAcquisitionMs": 10,
    "sandboxStartupMs": 5,
    "compileMs": 90,
    "executionMs": 32,
    "resultMs": 3,
    "persistenceMs": 0,
    "totalMs": 160,
    "cachedCompilation": false
  },
  "completedAt": "2026-10-06T04:30:15.268000Z"
}
```

### Example D: WRONG_ANSWER Result (Hidden Test Failure with Anti-Leak Protection)

```json
{
  "contractVersion": "1",
  "jobId": "job-submit-77889900-1123",
  "submissionId": "sub-submit-77889900-1123",
  "workerId": "aws-judge-worker-ap-south-1a",
  "status": "COMPLETED",
  "verdict": "WRONG_ANSWER",
  "runtimeMs": 44,
  "memoryKb": 17100,
  "testCasesPassed": 12,
  "totalTestCases": 24,
  "firstFailedTest": {
    "testNumber": 13,
    "actualOutput": "[-1, -1]",
    "expectedOutput": null,
    "failureType": "WRONG_ANSWER",
    "errorMessage": null,
    "isSample": false
  },
  "compileOutput": null,
  "stderrOutput": null,
  "stdoutOutput": null,
  "telemetry": {
    "executionId": "sub-submit-77889900-1123",
    "totalMs": 185,
    "compileMs": 85,
    "executionMs": 44,
    "cachedCompilation": false
  },
  "completedAt": "2026-10-06T04:30:30.120000Z"
}
```

### Example E: COMPILATION_ERROR Result

```json
{
  "contractVersion": "1",
  "jobId": "job-submit-77889900-1124",
  "submissionId": "sub-submit-77889900-1124",
  "workerId": "aws-judge-worker-ap-south-1b",
  "status": "COMPLETED",
  "verdict": "COMPILATION_ERROR",
  "runtimeMs": 0,
  "memoryKb": 0,
  "testCasesPassed": 0,
  "totalTestCases": 24,
  "firstFailedTest": null,
  "compileOutput": "Main.java:5: error: ';' expected\n        int x = 42\n                  ^\n1 error",
  "stderrOutput": null,
  "stdoutOutput": null,
  "telemetry": {
    "executionId": "sub-submit-77889900-1124",
    "totalMs": 95,
    "compileMs": 90,
    "executionMs": 0,
    "cachedCompilation": false
  },
  "completedAt": "2026-10-06T04:30:45.050000Z"
}
```

### Example F: INTERNAL_ERROR Result (Worker Infrastructure Anomaly)

```json
{
  "contractVersion": "1",
  "jobId": "job-submit-77889900-1125",
  "submissionId": "sub-submit-77889900-1125",
  "workerId": "aws-judge-worker-ap-south-1c",
  "status": "INTERNAL_ERROR",
  "verdict": "INTERNAL_ERROR",
  "runtimeMs": 0,
  "memoryKb": 0,
  "testCasesPassed": 0,
  "totalTestCases": 0,
  "firstFailedTest": null,
  "compileOutput": null,
  "stderrOutput": "Worker encountered unhandled execution supervisor exception: sandbox initialization failed.",
  "stdoutOutput": null,
  "telemetry": null,
  "completedAt": "2026-10-06T04:31:00.005000Z"
}
```
