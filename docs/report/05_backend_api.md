# 05 - Backend API & Services

## Overview & Architecture

VERNIQ's backend architecture diverges from traditional REST/GraphQL monoliths:
1. **Client-to-Database Direct Layer (PostgREST):** The frontend communicates directly with PostgreSQL via Supabase's auto-generated PostgREST HTTP API and Supabase Auth.
2. **Dedicated Code Judge HTTP & Polling Worker:** A standalone Python service (`backend/judge/src/worker.py`) that exposes a native HTTP microservice on port 8080 (default) and concurrently polls the `submissions` table in Supabase.
3. **AI Mentor & Mock Interview Microservice:** (`backend/ai/`): [PLANNED] / [SKELETON ONLY]. Only `README.md` and `requirements.txt` exist; zero HTTP routes or FastAPI instances are implemented.
4. **Backend CLI Subsystems:** Modular Python engines for Problem Catalog Ingestion (`backend/importer/`), Batch AI Authoring (`backend/authoring/`), and Roadmap Progress Calculation (`backend/roadmap/`).

---

## HTTP Endpoints Matrix

### Judge Worker HTTP Service (`backend/judge/src/worker.py`)

The judge worker runs a built-in Python `http.server.HTTPServer` using `JudgeRequestHandler`.

#### 1. `GET /health` (or `GET /`)
- **Status:** [DONE]
- **File:** [`backend/judge/src/worker.py:258-268`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/worker.py#L258-L268)
- **Purpose:** Healthcheck and liveness probe for load balancers and orchestrators.
- **Auth Required:** None (Public).
- **Request Headers / Query:** None.
- **Response Schema (`application/json`):**
  ```json
  {
    "status": "healthy",
    "worker": "judge-worker-1",
    "concurrency": 8,
    "cache_enabled": true,
    "time": "2026-10-04T06:23:45.123456+00:00"
  }
  ```
- **Error Codes:** 500 on unhandled worker failure.
- **Rate Limiting:** None.

#### 2. `GET /telemetry`
- **Status:** [DONE]
- **File:** [`backend/judge/src/worker.py:270-279`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/worker.py#L270-L279)
- **Purpose:** Provides operational metrics on memory cache utilization and worker capacity.
- **Auth Required:** None (Public).
- **Response Schema (`application/json`):**
  ```json
  {
    "worker_id": "judge-worker-1",
    "concurrency": 8,
    "cache_entries": 14,
    "max_cache_entries": 500
  }
  ```
- **Error Codes:** None.
- **Rate Limiting:** None.

#### 3. `POST /cancel`
- **Status:** [DONE]
- **File:** [`backend/judge/src/worker.py:286-307`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/worker.py#L286-L307)
- **Purpose:** Immediately aborts an in-flight compilation or execution process tree for a given submission ID.
- **Auth Required:** None (Unauthenticated).
- **Request Schema (`application/json`):**
  ```json
  {
    "execution_id": "sub-1234-uuid"
  }
  ```
- **Validation:** Must supply `execution_id` or `submission_id`.
- **Response Schema (`application/json`):**
  ```json
  {
    "status": "ok",
    "cancelled": true,
    "execution_id": "sub-1234-uuid"
  }
  ```
- **Error Codes:**
  - `400 Bad Request`: `{"error": "Invalid JSON"}` or `{"error": "Missing execution_id"}`.
- **Rate Limiting:** None.

#### 4. `POST /execute`
- **Status:** [DONE]
- **File:** [`backend/judge/src/worker.py:309-405`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/worker.py#L309-L405)
- **Purpose:** Core execution gateway. Receives source code and test cases (or fetches canonical suite from Supabase via `service_role`), executes within sandboxed runner, and returns execution verdicts and telemetry.
- **Auth Required:** None (Unauthenticated direct access allowed; relies on CORS and network perimeter).
- **Request Schema (`application/json`):**
  ```json
  {
    "execution_id": "optional-uuid",
    "language": "python",
    "source_code": "def solution(): ...",
    "stdin_input": "optional raw stdin",
    "is_custom_run": false,
    "problem_id": "optional-uuid-for-canonical-fetching",
    "mode": "RUN | SUBMIT",
    "test_cases": [
      {
        "input": "2 7 11 15\n9",
        "expected_output": "0 1",
        "is_sample": true
      }
    ]
  }
  ```
- **Execution Lifecycle & Validation:**
  - If `test_cases` are provided, runs against provided cases.
  - If `problem_id` is passed and `mode == "SUBMIT"`, fetches hidden canonical test suite from Supabase database via `service_role` key (bypassing client-side test exposure).
  - Validates language against supported set: `python`, `cpp`, `java`, `typescript`, `go`.
  - Dispatches to `concurrent.futures.ThreadPoolExecutor(max_workers=concurrency)`.
  - Timeout calculation: `pool_timeout = max(30.0, min(300.0, len(test_cases) * 0.8 + 25.0))`.
- **Response Schema (`application/json`):**
  ```json
  {
    "verdict": "accepted | wrong_answer | time_limit_exceeded | memory_limit_exceeded | compilation_error | runtime_error | internal_error",
    "runtime_ms": 142,
    "memory_kb": 24512,
    "stdout_output": "Optional stdout",
    "stderr_output": "Optional stderr",
    "compile_output": "Compiler error message if compilation failed",
    "test_cases_passed": 150,
    "total_test_cases": 150,
    "first_failed_test": {
      "case_index": 4,
      "input": "1000",
      "expected_output": "42",
      "actual_output": "0"
    },
    "sample_test_results": [
      {
        "input": "...",
        "expected": "...",
        "actual": "...",
        "passed": true
      }
    ],
    "telemetry": {
      "execution_id": "exec-1234",
      "request_received_at": "2026-10-04T06:23:45.000Z",
      "job_queued_at": "2026-10-04T06:23:45.002Z",
      "compile_ms": 45,
      "total_ms": 230,
      "cached_compilation": true
    }
  }
  ```
- **Error Codes:**
  - `400 Bad Request`: Invalid JSON.
  - `200 OK`: Even compilation errors or runtime errors return HTTP 200 with structured verdict `compilation_error` or `runtime_error`.

#### 5. `OPTIONS / *` (CORS Preflight)
- **Status:** [DONE]
- **File:** [`backend/judge/src/worker.py:250-256`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/worker.py#L250-L256)
- **Response Headers:**
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: GET, POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`

---

## Supabase PostgreSQL Functions & Database Triggers

All business logic triggers and functions run directly inside PostgreSQL.

| Function | Trigger / Invocation | Purpose | Security Context | Migration File | Status |
|---|---|---|---|---|---|
| `public.handle_updated_at()` | BEFORE UPDATE on tables | Automatically updates `updated_at = NOW()` | `SECURITY DEFINER` | `20261001000000` | [DONE] |
| `public.prevent_profile_role_update()` | BEFORE UPDATE OF role ON `public.profiles` | Blocks non-service-role users from escalating privileges to `admin` | `SECURITY DEFINER` | `20261001000001` | [DONE] |
| `public.handle_new_user()` | AFTER INSERT ON `auth.users` | Creates corresponding row in `public.profiles` with default role `student` | `SECURITY DEFINER` | `20261001000001` / `05` | [DONE] |
| `public.sync_college_stats()` | AFTER INSERT OR UPDATE ON `public.profiles` | Recomputes student count and aggregate solved problem counts per college | `SECURITY DEFINER` | `20261001000002` / `05` | [DONE] |
| `public.handle_submission_completion()` | AFTER INSERT OR UPDATE OF verdict ON `public.submissions` | Increments `profiles.problems_solved` and updates `user_problem_progress` when verdict is `accepted` | `SECURITY DEFINER` | `20261001000004` | [DONE] |

### Code References for Core Functions:
- **Role Escalation Protection (`prevent_profile_role_update`):**
  ```sql
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
      RAISE EXCEPTION 'Only service_role can modify user roles';
    END IF;
  END IF;
  ```
- **New User Auto-Provisioning (`handle_new_user`):**
  Extracts `raw_user_meta_data->>'full_name'`, sets `reputation_score = 0`, `problems_solved = 0`, `role = 'student'`.

---

## Background Workers, Queues & Scheduled Jobs

### 1. Supabase Polling Worker
- **File:** [`backend/judge/src/worker.py:60-94, 218-225`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/worker.py#L60-L94)
- **Mechanism:** Polling loop querying `submissions` table where `verdict = 'pending'` ordered by `created_at ASC` with `.limit(1)`.
- **Concurrency Control:** Atomic status transition `verdict: 'pending' -> 'running'` using conditional `.eq("verdict", "pending")` update (optimistic row claim).
- **Interval:** Configurable via `POLL_INTERVAL_SECONDS` (default `1.0s`).

### 2. Batch Content Authoring Engine
- **Files:** [`backend/authoring/batch_manager.py`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/authoring/batch_manager.py), [`backend/authoring/pipeline.py`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/authoring/pipeline.py)
- **Status:** [PARTIAL]
- **Mechanism:** Multi-stage pipeline: Selection -> Draft Generation -> Test Generation -> Static Verification -> Review Staging.
- **Execution:** Invoked via internal Python script / CLI; not exposed via REST API.

### 3. Problem Importer Engine
- **Files:** [`backend/importer/pipeline.py`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/importer/pipeline.py), [`backend/importer/importer.py`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/importer/importer.py)
- **Status:** [DONE]
- **Mechanism:** Ingests external problem sets into `staging` -> applies taxonomy mapping (`domains`, `topics`) -> loads into `problems` and `test_cases`.

### 4. Cron & Webhook Infrastructure
- **Status:** [PLANNED]
- **Missing Components:**
  - No `pg_cron` jobs configured in migrations.
  - No Celery, Redis, RabbitMQ, or BullMQ queue workers.
  - No incoming webhooks for payments (Razorpay/Stripe) or external judge events.
