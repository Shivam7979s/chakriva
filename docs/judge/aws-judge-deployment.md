# AWS EC2 Production Judge Environment & Deployment Specification (Phase J.7.1)

## 1. Overview & Architecture

This document specifies the target environment, security posture, configuration model, and deployment architecture for the **Chakriva Judge Execution Plane** hosted on AWS EC2.

The Judge Execution Plane operates as an asynchronous, headless worker consumer:

```text
Chakriva Application Plane (Spring Boot)
                  ↓
          Validated JudgeJob
                  ↓
       AWS ElastiCache / Redis
      (verniq:submissions:queue)
                  ↓
       AWS EC2 Judge Worker Node
          (chakriva-judge-01)
                  ↓
   Ephemeral Docker Execution Sandbox
     (verniq-judge-sandbox:latest)
                  ↓
       Canonical JudgeResult
                  ↓
 Authenticated Internal Callback (HTTPS/HTTP)
                  ↓
Chakriva Application Plane (Result Ingestion)
```

---

## 2. AWS Host Specifications

| Parameter | Specification | Rationale |
|---|---|---|
| **AWS Region** | `ap-south-1` (Mumbai) | Colocated with Chakriva primary application services for minimal transport latency. |
| **Instance Name** | `chakriva-judge-01` | Dedicated single-tenant judge execution node. |
| **Instance ID** | `i-00b277624270293bf` | Provisioned EC2 compute resource. |
| **Instance Type** | `t3.micro` | 2 vCPU, ~1 GiB physical RAM, 2 GiB swap space, 20 GiB gp3 root EBS. |
| **Operating System**| Ubuntu Server 24.04 LTS x86_64 | Standardized LTS Linux distribution with cgroup v2 unified hierarchy enabled. |
| **Container Engine**| Docker CE 29.8.2 | Managed via systemd; cgroup driver `systemd`, storage driver `overlay2`. |

---

## 3. Directory Structure & Permissions

The production judge installation resides strictly under `/opt/chakriva-judge` on the EC2 host:

```text
/opt/chakriva-judge/
├── app/                  # Application source code / deployed wheels (owner: judge/ubuntu, perms: 0750)
├── logs/                 # Operational stdout/stderr logs (owner: judge/ubuntu, perms: 0750)
├── data/                 # Compilation cache and telemetry artifacts (owner: judge/ubuntu, perms: 0750)
│   └── .cache/           # Deterministic SHA-256 compilation cache (LRU, max 500 entries)
├── tmp/                  # Ephemeral execution scratch mounts (owner: judge/ubuntu, perms: 0770)
└── .env                  # Production runtime secret configuration (owner: judge/ubuntu, perms: 0600)
```

### Security Directives
- **Non-Root Ownership:** The worker process runs as an unprivileged host user (`ubuntu` or dedicated `judge` service user).
- **No World-Writable Paths:** Broad permissions (`777`) are strictly prohibited.
- **Secret File Isolation:** `/opt/chakriva-judge/.env` is read-only to its owner (`0600`).

---

## 4. Environment Configuration Strategy

Runtime configuration is loaded from `/opt/chakriva-judge/.env` outside the Git working tree. The variable names match the verified Chakriva Python judge codebase exactly:

| Variable Name | Required | Default / Format | Description |
|---|---|---|---|
| `REDIS_URL` | Optional | `redis://...` | Full Redis connection URI (takes precedence if set). |
| `REDIS_HOST` | Required | `localhost` | Redis host or AWS ElastiCache configuration endpoint. |
| `REDIS_PORT` | Required | `6379` | Redis TCP port. |
| `REDIS_DB` | Required | `0` | Redis logical database index. |
| `REDIS_PASSWORD` | Optional | `<secret>` | Authentication token for Redis / ElastiCache AUTH. |
| `JUDGE_QUEUE_NAME` | Required | `verniq:submissions:queue` | Canonical Redis List key consumed via `BLPOP`. |
| `VERNIQ_JUDGE_INTERNAL_SECRET` | Required | `<secret>` | Shared secret for authenticated callback headers and internal endpoints. |
| `JUDGE_CALLBACK_URL` | Required | `http://.../api/v1/internal/judge/results` | Destination endpoint for delivering completed `JudgeResult` payloads. |
| `SPRING_BOOT_CALLBACK_URL` | Optional | `http://.../api/v1/internal/judge/results` | Alias for `JUDGE_CALLBACK_URL`. |
| `WORKER_ID` | Required | `chakriva-judge-node-01` | Unique worker node identifier reported in result contracts. |
| `WORKER_CONCURRENCY` | Required | `1` | Concurrency pool size. Preserved at `1` for `t3.micro` resource safety. |
| `MAX_CPU_TIME_SECONDS` | Required | `2.0` | Default execution timeout threshold per test case. |
| `MAX_MEMORY_MB` | Required | `256` | Default cgroup memory limit per candidate execution. |
| `JUDGE_DOCKER_ENABLED` | Required | `true` | Enables Docker sandbox container isolation. |
| `JUDGE_DOCKER_IMAGE` | Required | `verniq-judge-sandbox:latest` | Dedicated candidate execution image. |
| `JUDGE_DOCKER_CPUS` | Required | `1.0` | CPU quota assigned to candidate execution containers. |
| `JUDGE_DOCKER_MEMORY_MB` | Required | `256` | RAM ceiling enforced via cgroup. |
| `JUDGE_DOCKER_PIDS_LIMIT`| Required | `64` | Maximum concurrent threads/processes allowed in candidate container. |
| `COMPILATION_CACHE_ENABLED` | Required | `true` | Enables deterministic compilation caching. |
| `COMPILATION_CACHE_DIR` | Required | `/opt/chakriva-judge/data/.cache` | Path to host compilation cache storage. |

### Secret Storage & Redaction Rules
1. **Zero Secret Ingestion in Git:** Production secrets are never committed to Git, Dockerfiles, or CI workflow definitions.
2. **Log Redaction:** `VERNIQ_JUDGE_INTERNAL_SECRET`, `REDIS_PASSWORD`, and database credentials must never be emitted into application logs or telemetry endpoints.
3. **Template Environment File:** The template `.env` provided in Git or scripts uses empty placeholders. Real values are injected at deployment time directly on the EC2 host.

---

## 5. Docker Access & Security Model

The judge worker requires controlled access to the host Docker daemon to orchestrate candidate execution containers.

### Hardening Standards
- **Local Unix Socket Only:** Communication occurs strictly via `/var/run/docker.sock`.
- **No Docker TCP API:** `tcp://0.0.0.0:2375` or unauthenticated remote Docker sockets are strictly prohibited.
- **Dedicated User Group:** Only the specific judge worker user is added to the host `docker` group.
- **Two Distinct Container Concepts:**
  - **A. Judge Worker / Orchestrator:** Trusted Python application (`backend/judge/Dockerfile`) managing Redis polling, queue state, container execution, and callback delivery.
  - **B. Candidate Execution Sandbox:** Untrusted, air-gapped, non-root candidate runtime (`backend/judge/Dockerfile.candidate`), rebuilt as `verniq-judge-sandbox:latest`.
- **Candidate Runtime Constraints:**
  - `--network none` (complete air-gapping)
  - `--read-only` (immutable root filesystem)
  - `--tmpfs /tmp:rw,exec,nosuid,size=64m` (in-memory scratch)
  - `--cap-drop ALL` (all Linux capabilities dropped)
  - `--security-opt no-new-privileges:true` (prevent setuid escalation)
  - `--pids-limit 64` (fork bomb suppression)
  - `--memory 256m --memory-swap 256m` (cgroup OOM enforcement)
  - `--user 1000:1000` (non-root `sandboxuser`)

---

## 6. Network Exposure & Security Group Architecture

```text
Internet
   │
   ├── (X) Port 2375 (Docker TCP)       [BLOCKED]
   ├── (X) Port 6379 (Redis)            [BLOCKED]
   ├── (X) Port 8080 (Spring Boot API)  [BLOCKED on Judge Node]
   ├── (X) Port 8085 (Judge Internal)   [BLOCKED from Public Internet]
   │
   └── (✓) Port 22 (SSH)                [ALLOWED only from Authorized Admin IP]
```

### Security Group Inbound Rules
| Type | Port Range | Protocol | Source | Purpose |
|---|---|---|---|---|
| SSH | `22` | TCP | Admin CIDR (`/32`) | Administrative host maintenance via SSH key. |

### Security Group Outbound Rules
| Type | Port Range | Protocol | Destination | Purpose |
|---|---|---|---|---|
| HTTPS | `443` | TCP | `0.0.0.0/0` | Package updates, base container image pulls, Supabase REST API. |
| Redis | `6379` | TCP | Redis / ElastiCache SG | Outbound queue connection (`BLPOP`). |
| Custom HTTP/S | `8080` / `443` | TCP | Spring Boot Application SG | Authenticated result callback endpoint. |

---

## 7. Resource Safety & Concurrency

The target instance (`t3.micro`) has constrained memory (1 GiB RAM). To prevent kernel OOM conditions:
- **`WORKER_CONCURRENCY=1`**: Strictly one candidate execution job processed at a time.
- **Swap Space**: 2 GiB active swap file configured to absorb transient host memory spikes.
- **Candidate Memory Ceiling**: 256 MB cgroup ceiling with swap disabled inside the container (`--memory-swap 256m`).
- **Container Cleanup**: Deterministic `docker kill` + `docker rm -f` executed in `finally` handlers prevents orphaned container accumulation.

---

## 8. Health & Observability

The judge worker exposes an internal HTTP monitoring interface listening on `127.0.0.1:8085`:
- **`GET /health`**: Operational readiness check (returns HTTP 200 with safe booleans: `redis_connected`, `docker_available`, `worker_state`).
- **`GET /telemetry`**: Operational metrics (jobs completed, queue wait latency, sandbox container lifecycle counts: `containers_started`, `containers_completed`, `containers_cleaned`).
- **Zero Public Exposure**: The port is bound locally (`127.0.0.1`) and never opened in the AWS Security Group.

---

## 9. Deployment Lifecycle & Rollback

### Deployment Prerequisites
1. Verified host baseline via `verify_ec2_host.sh`.
2. Created production directory structure via `setup_ec2_host.sh`.
3. Validated `/opt/chakriva-judge/.env` with production callback secrets and Redis credentials.
4. Pre-built candidate sandbox image `verniq-judge-sandbox:latest`.

### Release Lifecycle
```text
1. Approved commit tagged on main (GitHub)
2. CI pipeline passes all 102 judge tests and Spring Boot callback tests
3. Pull release artifact / git tree into /opt/chakriva-judge/app
4. Build candidate container image if toolchain changed:
     docker build -t verniq-judge-sandbox:latest -f Dockerfile.candidate .
5. Restart judge worker systemd unit:
     systemctl restart chakriva-judge
6. Verify operational health:
     curl -sf http://127.0.0.1:8085/health
```

### Rollback Strategy
If a newly deployed version fails `/health` or produces callback errors:
1. Revert `/opt/chakriva-judge/app` to previous known good commit.
2. Restart the worker service: `systemctl restart chakriva-judge`.
3. Candidate jobs safely remain on the Redis queue or are rejected with `INTERNAL_ERROR` without duplicate execution.
