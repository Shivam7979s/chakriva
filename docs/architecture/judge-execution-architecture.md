# VERNIQ Judge Execution Architecture

**Version**: 3.0 (Production Single-Container Optimized Architecture)  
**Status**: Production Standard (AWS EC2 `t3.micro`)  
**Deployment Date**: October 2026  

---

## 1. System Topology & End-to-End Request Lifecycle

The VERNIQ online judge processes user submissions through a decoupled, asynchronous, durable architecture backed by Redis and PostgreSQL.

```
                     VERNIQ Web Frontend (React + Vite)
                                    │
                                    │ HTTP POST /api/v1/submissions (JWT authenticated)
                                    ▼
                         Spring Boot API Gateway
                                    │
            ┌───────────────────────┴───────────────────────┐
            │                                               │
            ▼                                               ▼
   PostgreSQL Database                            Redis Queue & Storage
   (Authoritative State: QUEUED)                 (verniq:submissions:queue)
            │                                               │
            │                                               │ Worker Claims Job (BRPOP)
            │                                               ▼
            │                                     Chakriva Judge Worker Daemon
            │                                     (python3 -m src.worker)
            │                                               │
            │                                               ├─ Claims Durable Lease (ZADD)
            │                                               ├─ Starts LeaseHeartbeat thread (20s)
            │                                               │
            │                                               ▼
            │                                    ONE Hardened Docker Sandbox
            │                                (verniq-judge-sandbox:latest per submission)
            │                                               │
            │                                               ├─ In-Container Compilation (javac / g++ / go)
            │                                               │
            │                                               ▼
            │                               In-Container Per-Test Execution Loop
            │                             (Fresh child subprocess per test case)
            │                             (Ephemeral /tmp/tc_{i} directory)
            │                             (preexec_fn=os.setsid process-group isolation)
            │                                               │
            │                                               ▼
            │                                    Verdict & Telemetry Aggregation
            │                                               │
            │                                               ▼
            │                                    Internal Callback POST
            │                            (/api/v1/internal/judge/results)
            │                                               │
            ▼                                               │
   PostgreSQL Database ◄────────────────────────────────────┘
   (Terminal State: ACCEPTED / WA / TLE)
            │
            │ Releases Lease (ZREM)
            │
            ▼
   Frontend Long-Polling / Realtime State Sync
   (Displays 150/150, runtimeMs, memoryKb, zero synthetic timeouts)
```

---

## 2. Architectural Evolution: Old vs. New

### A. The Legacy Architecture (1 Container Per Test Case)
Under the legacy pipeline, each test case within a submission triggered an independent Docker container launch:
- A 150-test submission (e.g. Merge Intervals) spawned **150 separate Docker containers**.
- Each container incurred:
  - Docker daemon API RPC overhead (~80–120 ms).
  - Cgroup, namespace, and veth network teardown/setup.
  - Full JVM cold-boot startup (`java -cp ...`) for every individual test (~120–160 ms).
- **Result**: Submissions suffered extreme serialization latency on single-vCPU nodes (~60.5s for 150 tests, ~81s for 200 tests).

### B. The Production Optimized Architecture (1 Sandbox Container Per Submission)
The new optimized architecture establishes a two-tiered isolation boundary:
1. **Tier 1 (Container Boundary)**: Exactly **ONE** hardened, air-gapped Docker container is created for the entire submission suite.
2. **Tier 2 (Process & Filesystem Boundary)**:
   - Source code is compiled **once** inside the container into an isolated build directory (`/tmp/build`).
   - An in-container test driver (`in_container_driver.py`) iterates through the canonical test suite.
   - For **every test case**, the driver spawns a fresh child subprocess (`subprocess.Popen`) running inside an ephemeral, dedicated working directory (`/tmp/tc_{i}`).
   - The child process runs with a detached process group (`preexec_fn=os.setsid`), strict resource limits, and automated process group kill on completion or timeout (`os.killpg`).
   - The test directory `/tmp/tc_{i}` is purged immediately after the test completes.

### C. Why Per-Test State Isolation is Strictly Preserved
- **Zero Static Variable Leakage**: Because a fresh OS process is spawned for each test, memory spaces, heap allocations, static variables, and JVM/C++ memory states cannot leak across test cases.
- **Zero Filesystem Artifact Leakage**: Each test executes in a unique working directory (`/tmp/tc_{i}`); any temporary files written by user code are quarantined and immediately deleted.
- **Complete Process Teardown**: If user code spawns background threads or daemon processes, `os.killpg(pgrp, signal.SIGKILL)` wipes the entire process tree before the next test begins.
- **Overhead Eliminated**: Container initialization and JVM compilation occur exactly once, eliminating ~99% of Docker daemon overhead.

---

## 3. Empirically Measured Production Performance

*All measurements below represent empirical data collected directly on AWS EC2 (`t3.micro`, 1-vCPU, 1 GB RAM) during live production canaries and soak validation.*

### A. Production Performance Comparison

| Metric | Old Production Baseline | New Single-Container Production | Measured Speedup |
|---|---:|---:|---:|
| **Easy (80 tests)** — Two Sum | ~32.0 s | **12.762 s** | **2.51x faster** (60.1% reduction) |
| **Medium (150 tests)** — Merge Intervals | ~60.5 s (60–61s) | **17.039 s** | **3.55x faster** (71.8% reduction) |
| **Hard (200 tests)** — Trapping Rain Water | ~81.0 s | **21.126 s** | **3.83x faster** (73.9% reduction) |
| **Wrong Answer (80 tests, failing test 1)** | ~1.5–3.0 s | **2.796 s** | Fast-fail instantaneous |
| **Real TLE (2.0s sandbox limit $\times$ 1.5)** | ~5.0–7.0 s | **5.863 s** | Precise kernel timeout kill |
| **Containers spawned per submission** | 80 / 150 / 200 | **1** | **98.8% – 99.5% reduction** |
| **JVM cold boot cycles per submission** | 80 / 150 / 200 | **1** | **98.8% – 99.5% reduction** |

### B. Phase 6 Concurrency & Soak Execution Measurements (Under Contention)
- **Easy (Two Sum 80)** in-sandbox suite execution: **8.1 s – 8.6 s**
- **Medium (Merge Intervals 150)** in-sandbox suite execution: **14.4 s – 14.8 s**
- **Wrong Answer (Two Sum 80)** in-sandbox suite execution: **2.6 s**

### C. Conceptual Timing Breakdown
To avoid confusion across monitoring dashboards, timing metrics are strictly distinguished:
1. **`judge_runtime_ms`**: The CPU/wall time of the slowest single test case within the suite (reported in the UI, e.g. `101 ms`).
2. **`execution_wall_ms`**: The total wall-clock time spent inside the sandbox container compiling and executing all $N$ test cases sequentially (e.g. `~14.5 s` for 150 tests).
3. **`queue_wait_ms`**: The time the job waited in Redis before being claimed by an available worker thread (e.g. `0–1 ms` when idle, or `~13.6 s` when waiting behind a preceding 150-test job under concurrency = 1).
4. **`total_wall_clock_ms`**: The end-to-end client duration measured from `POST /submissions` HTTP dispatch until the terminal database state is polled by the client (includes network transport, queue wait, sandbox creation, execution, internal callback, and database commit).

*(Note: Prior projected estimates of ~2.6s / ~4.9s / ~6.5s were theoretical calculations that did not account for AWS `t3.micro` 1-vCPU context switching during child process spawning. Only the empirical AWS measurements above represent production ground truth).*

---

## 4. Sandbox Security Invariants

The judge sandbox enforces a hardened, defense-in-depth isolation boundary. Every sandbox container is spawned with the following immutable parameters:

```bash
docker run \
  --name verniq-judge-suite-<id> \
  --network none \
  --read-only \
  --tmpfs /tmp:rw,exec,nosuid,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --pids-limit 64 \
  --memory 256m \
  --memory-swap 256m \
  --cpus 1.0 \
  --user 1000:1000 \
  -v <scratch_dir>:/sandbox:ro \
  verniq-judge-sandbox:latest
```

### Security Invariants & Guarantees:
1. **Network Air-Gap (`--network none`)**: Total network namespace isolation. User code cannot establish outbound connections, perform DNS queries, access cloud metadata services (`169.254.169.254`), or scan internal networks.
2. **Read-Only Root Filesystem (`--read-only`)**: The root filesystem is mounted read-only. User code cannot write to system binaries, modify `/etc`, or alter system libraries.
3. **Restricted Writable Memory Filesystem (`--tmpfs /tmp:rw,exec,nosuid,size=64m`)**: All scratch space is allocated in memory (RAM), limited to 64 MB, with `nosuid` protection. User code cannot persist files across container destruction.
4. **Zero Linux Capabilities (`--cap-drop ALL`)**: All root capabilities (`CAP_SYS_ADMIN`, `CAP_NET_ADMIN`, etc.) are stripped.
5. **Privilege Escalation Prevention (`--security-opt no-new-privileges:true`)**: Prevents setuid binaries from escalating privileges.
6. **Fork-Bomb & Thread Exhaustion Shield (`--pids-limit 64`)**: Bounded to 64 PIDs total per container. Attempts to spawn excessive threads fail immediately with `Resource temporarily unavailable`.
7. **Strict Memory & Swap Capping (`--memory 256m --memory-swap 256m`)**: Memory is capped at 256 MB. By setting memory-swap equal to memory, swap breakout is completely prohibited. If memory is exceeded, the Linux OOM killer terminates the process.
8. **CPU Throttling (`--cpus 1.0`)**: Enforces strict CFS quota limiting the sandbox to 1 vCPU core.
9. **Non-Root Execution (`--user 1000:1000`)**: Sandbox runs as unprivileged user `sandboxuser` (UID 1000, GID 1000).
10. **Read-Only Workspace Mount (`-v <scratch_dir>:/sandbox:ro`)**: Submission code and in-container driver are mounted strictly read-only (`:ro`). User code cannot tamper with the input spec or the driver script.
11. **Per-Test Subprocess Cleanup (`os.setsid` + `os.killpg`)**: Subprocesses run in detached process groups. When a test completes or times out, the entire process tree is terminated with `SIGKILL`.

---

## 5. Durable Lease & Recovery Model (J.9.4)

To prevent lost jobs during worker restarts while preventing duplicate execution during long-running test suites, the worker implements a heartbeat-renewed durable lease pattern:

```
Worker Claims Job
       │
       ▼
ZADD verniq:submissions:leases:active <now + 60s> <job_id>
       │
       ├─────────────────────────────────────────────────┐
       ▼                                                 ▼
Main Thread Executes Sandbox                  Background LeaseHeartbeat Daemon
(12s – 25s execution duration)                (Runs every 20s)
       │                                                 │
       │                                                 ▼
       │                                      ZADD verniq:submissions:leases:active <now + 60s> <job_id>
       │                                      (Renews lease by +60s)
       ▼                                                 │
Execution Completes                                      │
       │                                                 ▼
Worker Issues Callback to Spring Boot         Heartbeat stopped
       │
       ▼
ZREM verniq:submissions:leases:active <job_id> (Clean Release)
```

### Recovery Semantics:
1. **Initial Lease Duration**: Granted for **60 seconds**.
2. **Heartbeat Frequency**: `LeaseHeartbeat` runs every **20 seconds**, extending the lease score in Redis by $+60\text{ seconds}$.
3. **Long-Running Suite Safety**: Long-running suites (e.g. 200 tests taking ~21s) continuously renew their lease; the Spring Boot `SubmissionRecoveryService` will **never** reclaim or requeue an active job while its heartbeat is alive.
4. **Crash Failover**: If the judge worker host suffers a kernel panic or container crash, the background heartbeat stops. Within 60 seconds, the lease expires. `SubmissionRecoveryService` identifies the expired lease and requeues the job.
5. **Max Attempts Protection**: Submissions are capped at `max_attempts = 3`. If a submission repeatedly causes worker crashes, it is transitioned to `SYSTEM_ERROR` rather than entering an infinite retry loop.
6. **Terminal-State Idempotency**: If a late callback arrives for an already recovered submission, Spring Boot enforces terminal-state immutability.

---

## 6. Verdict Semantics & Anti-Leak Guarantees

The judge produces 6 deterministic verdicts:
1. **`ACCEPTED`**: Solution compiled cleanly, executed within time and memory bounds on all test cases, and matched canonical expected outputs.
2. **`WRONG_ANSWER`**: Solution produced output that differed from canonical expected output. Fails fast on the first failing test case (`failedTestIndex: N`).
3. **`COMPILATION_ERROR`**: Compiler (`javac`, `g++`, `go build`) returned non-zero exit code. Detailed compiler diagnostics captured in `compileOutput`.
4. **`RUNTIME_ERROR`**: Uncaught exception, non-zero process exit code (e.g. `java.lang.NullPointerException`, `SIGSEGV`).
5. **`TIME_LIMIT_EXCEEDED`**: Process exceeded the per-test CPU limit (2.0s base $\times$ language multiplier). **This verdict must originate strictly from the judge sandbox process killer.** The frontend must never fabricate an algorithmic TLE.
6. **`INTERNAL_ERROR`**: Host-level failure (e.g. Docker socket unavailable, disk failure). Requeued automatically if attempts remain.

### Strict Anti-Leak Protection:
- **Canonical Inputs/Outputs Quarantined**: Canonical test cases are fetched directly from PostgreSQL/Supabase by the judge worker.
- **Client Sanitization**: When a submission produces `WRONG_ANSWER` or `RUNTIME_ERROR`, the backend records the failing test index and error message, but **never** exposes hidden canonical input data or expected output data in API responses.

---

## 7. Frontend Polling & Safety Window

- **Polling Implementation**: Managed via `frontend/src/lib/submissionService.ts` and `frontend/src/hooks/useSubmissionRealtime.ts`.
- **90-Second Polling Safety Window**: The frontend maintains active polling for up to **90 seconds** (`MAX_POLL_TIME = 90000ms`).
- **Zero Synthetic TLE Invariant**: If a submission is still executing at 30s or 60s, the client preserves the `pending` or `running` state. The UI displays the operational spinner and never manufactures a `TIME_LIMIT_EXCEEDED` error due to client polling delays.
- **Terminal Synchronization**: Once the database reflects the callback result, the frontend transitions immediately to display verdict badges, execution runtime, and test pass counts (e.g. `150/150`).
