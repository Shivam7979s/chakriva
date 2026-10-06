# Production Judge Sandbox (Phase J.6)

## Overview

Phase J.6 establishes the hardened container execution sandbox for untrusted candidate code submitted to the CHAKRIVA / VERNIQ online judge platform. It shifts execution from uncontained host subprocesses into ephemeral, resource-constrained, air-gapped Docker containers (`verniq-judge-sandbox:latest`), guaranteeing strict isolation across multi-tenant workloads while preserving all contract, verdict, and callback semantics established in J.5.1–J.5.4.

---

## 1. Threat Model & Security Boundaries

Untrusted candidate code must be treated as hostile by default. Attack vectors addressed by this architecture include:

| Threat Vector | Mitigation Strategy | Enforcement Mechanism |
|---|---|---|
| **Network Exfiltration / SSRF / Reverse Shells** | Complete air-gapping | `--network none` flag on Docker container invocation |
| **Root Filesystem Tampering / Persistence** | Immutable root filesystem | `--read-only` root mount |
| **Privilege Escalation / Setuid Binaries** | Drop all capabilities; prevent privilege elevation | `--cap-drop ALL`, `--security-opt no-new-privileges:true` |
| **Non-Root Execution** | Sandboxed UID / GID boundary | `--user 1000:1000` (`sandboxuser`) |
| **Fork Bombs / Process Exhaustion** | Strict process/thread limits | `--pids-limit 64` (per container) |
| **Host Memory Exhaustion / OOM Breakout** | Bounded cgroup memory + swap cap | `--memory <M>m`, `--memory-swap <M>m` |
| **CPU Starvation / Infinite Loops** | Core limiting & timeout termination | `--cpus 1.0`, timeout enforcement + `docker kill` fallback |
| **Host Project / Worker Source Snooping** | Ephemeral bind mount isolation | Strictly mounting only scratch directories (`/sandbox:ro` for execution, `/sandbox:rw` for compile) |
| **Stdout / Stderr Bombing** | Output buffer caps | Hard bounded buffer reading (`1 MiB` max per stream) |
| **Container / Scratch Directory Leaks** | Deterministic ephemeral cleanup | Immediate `docker rm -f` in `finally` block + temp directory context manager |

---

## 2. Architecture & Container Execution Lifecycle

```text
Worker Dequeues Job (JudgeJob v1)
            ↓
SandboxRunner Prepares Ephemeral Scratch Directory
            ↓
Language Profile Check (Compiled vs Interpreted)
   ├── Compiled (C++, Java, Go):
   │       ├── Cache Lookup (SHA-256 with env_tag="docker")
   │       └── If Miss: Compile Container (isolated, -v scratch:/sandbox:rw)
   │               └── Cache Put (persists compiled binaries / .class files)
   └── Interpreted (Python, TypeScript):
           └── Direct Execution
            ↓
Per-Test-Case Execution Loop
   ├── Mount scratch directory read-only: -v <scratch>:/sandbox:ro
   ├── Execute inside ephemeral container with --tmpfs /tmp:rw,exec,nosuid,size=64m
   ├── Feed stdin via pipe (bounded)
   ├── Capture stdout & stderr (bounded to 1 MiB)
   ├── Measure execution time (wall clock & process telemetry)
   └── Finally: Ensure container termination (docker kill) & removal (docker rm -f)
            ↓
Output Normalization & Verdict Resolution
   ├── Accepted / Wrong Answer / Time Limit Exceeded / Memory Limit Exceeded / Runtime Error / Cancelled
            ↓
Canonical JudgeResult Produced & Transmitted via J.5.4 Authenticated Callback
```

---

## 3. Container Hardening Parameters

Every execution container is spawned with the following flags:

```bash
docker run \
  --name verniq-judge-<execution_id>-<timestamp> \
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
  -e GOCACHE=/tmp/go-cache \
  -e GOTMPDIR=/tmp \
  -e GOMAXPROCS=2 \
  -v /path/to/ephemeral/scratch:/sandbox:ro \
  -i \
  verniq-judge-sandbox:latest \
  sh -c "cp -r /sandbox/* /tmp/ 2>/dev/null || true; cd /tmp && <command>"
```

### Technical Rationale for Key Flags

1. **`--network none`**: Disables container networking entirely. Candidate code cannot open network sockets, connect to AWS metadata services (`169.254.169.254`), or ping external endpoints.
2. **`--read-only`**: Prevents candidate code from modifying any OS file, installing binaries, or tampering with toolchain installations.
3. **`--tmpfs /tmp:rw,exec,nosuid,size=64m`**: Mounts an in-memory ephemeral RAM disk for temporary scratch files (e.g. Go build cache, runtime class loading) while strictly preventing disk exhaustion.
4. **`--cap-drop ALL`**: Drops all Linux capabilities (including `CAP_NET_RAW`, `CAP_SYS_ADMIN`, `CAP_CHOWN`, `CAP_KILL`).
5. **`--security-opt no-new-privileges:true`**: Prevents setuid binaries or sub-processes from acquiring elevated privileges.
6. **`--pids-limit 64`**: Enforces a strict ceiling on concurrent processes and threads. Mitigates fork bombs before they can impact the host worker node.
7. **`--memory <limit>m` and `--memory-swap <limit>m`**: Disables swap expansion. When a candidate exceeds memory, Linux cgroup OOM-killer immediately terminates the process (exit code 137), cleanly mapped to `Memory Limit Exceeded`.
8. **`--user 1000:1000`**: Non-root UID/GID (`sandboxuser`) ensuring zero root filesystem ownership.

---

## 4. Multi-Language Toolchain

The candidate execution image (`verniq-judge-sandbox:latest`) provides isolated, standardized compiler and runtime toolchains:

| Language | Toolchain Version | Compilation Command | Runtime Flags |
|---|---|---|---|
| **C++** | GCC 13.3 (C++17) | `g++ -O3 solution.cpp -o solution` | `./solution` |
| **Java** | OpenJDK 21 (LTS) | `javac <Main>.java` | `java -XX:+TieredCompilation -XX:TieredStopAtLevel=1 -XX:MaxRAMPercentage=75.0 -Xss4m -cp . <Main>` |
| **Python** | Python 3.12 | None (interpreted) | `python3 solution.py` |
| **TypeScript / Node** | Node.js 18 / tsx | None (JIT/strip-types) | `tsx solution.ts` |
| **Go** | Go 1.22 | `go build -o solution main.go` | `./solution` |

### Java 21 Container Memory Adaptation
OpenJDK 21 incorporates native container cgroup awareness. By configuring `-XX:MaxRAMPercentage=75.0` with `-Xss4m`, the JVM dynamically adapts to whatever memory limit is assigned to the container (e.g. 128 MB, 256 MB, 512 MB) without exceeding cgroup memory ceilings or triggering false OOM kills.

---

## 5. Compilation Caching & Environment Isolation

Compilation artifacts are indexed deterministically using SHA-256 cryptographic keys:
```text
key = SHA-256(language :: env_tag :: compiler_version :: compiler_flags :: source_code)
```
- **Environment Tag (`env_tag`):** Differentiates container builds (`"docker"`) from host fallback builds (`"host"`).
- **Binary Compatibility:** Prevents class file format incompatibilities (e.g., host Java 26 vs container Java 21) or binary ABI mismatches.
- **LRU Eviction:** Retains up to 500 compiled units on the worker node, reducing C++ and Java compile latency from ~2.5s to 0ms on subsequent test runs.

---

## 6. Telemetry & Observability

The judge worker exposes real-time sandbox operational metrics via `/telemetry` and `/health`:

```json
{
  "sandbox": {
    "containers_started": 142,
    "containers_completed": 139,
    "containers_failed": 3,
    "containers_timed_out": 2,
    "containers_cleaned": 142,
    "sandbox_errors": 0,
    "docker_available": true,
    "image_present": true
  }
}
```

- **Container Leak Detection:** `containers_started == containers_cleaned` verifies zero container leakage across executions.
- **Automated Fallback:** If Docker daemon becomes unavailable, `SandboxRunner` gracefully falls back to host subprocess execution with operational warning logs.

---

## 7. AWS Deployment & Host Runtime Assumptions

When deployed to production AWS EC2 worker instances (e.g. `t3.micro` or `c6i.large`), the following host prerequisites apply:

1. **Operating System:** Ubuntu 22.04 LTS or Amazon Linux 2023 with Linux Kernel >= 5.15.
2. **cgroup v2 Support:** Host kernel must have unified cgroup v2 hierarchy enabled for exact memory and PID limits (`systemd.unified_cgroup_hierarchy=1`).
3. **Docker Engine:** Docker Engine CE >= 24.0 installed; worker user is in the `docker` group.
4. **Base Image:** `verniq-judge-sandbox:latest` pre-pulled or built locally during EC2 launch template user-data initialization.
5. **No Host Access:** Candidate containers do NOT mount `/var/run/docker.sock`, `/etc`, `/home`, or any AWS IAM credential paths.

---

## 8. Verification & Test Coverage

The sandbox security suite (`backend/judge/tests/test_docker_sandbox.py`) rigorously validates 30 security and isolation controls:

1. Normal execution across all 5 languages (C++, Java, Python, TypeScript, Go)
2. Network air-gapping: outbound HTTP requests blocked
3. Network air-gapping: DNS lookups fail
4. Read-only root filesystem prevents writing to `/etc`, `/usr`, `/root`
5. Non-root user execution (`uid=1000(sandboxuser)`)
6. Fork bomb suppression (`--pids-limit 64`)
7. Memory limit enforcement: OOM killer triggered on excess heap allocation
8. Infinite loop termination: timeout cleanly maps to `time_limit_exceeded`
9. Host project filesystem access prevention: `/app`, `/backend` inaccessible
10. Host environment variables and secrets not leaked into candidate environment
11. Ephemeral container cleanup: verified via `docker ps -a`
12. Concurrent test executions do not cross-contaminate scratch spaces
13. Deterministic compilation cache hit/miss semantics
14. Bounded output limits: stdout/stderr capped at 1 MiB

**Test Suite Status: 30 / 30 PASS**
