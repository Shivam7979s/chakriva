# 13 - DevOps, Hosting & Configuration Management

## Environment Variable Directory

The platform utilizes three configuration scopes. *In compliance with security protocols, variable names and purposes are documented without secret values.*

### 1. Frontend Configuration (`frontend/.env` / `apps/web/.env.local`)
| Variable Name | Required | Service | Purpose |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Frontend SPA | URL of the Supabase project / PostgREST gateway |
| `VITE_SUPABASE_ANON_KEY` | Yes | Frontend SPA | Public publishable key for client-side queries |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Optional | Frontend SPA | Alternative naming for anon key |
| `VITE_JUDGE_SERVICE_URL` | Yes | Frontend SPA | Target endpoint for code execution worker (e.g. `http://127.0.0.1:8080`) |
| `VITE_AI_SERVICE_URL` | Optional | Frontend SPA | URL for AI mentorship FastAPI service (e.g. `http://127.0.0.1:8000`) |
| `VITE_APP_ENV` | Optional | Frontend SPA | Environment identifier (`development` / `production`) |
| `VITE_APP_VERSION` | Optional | Frontend SPA | Version indicator displayed in platform headers |

### 2. Online Code Judge Configuration (`backend/judge/.env`)
| Variable Name | Default | Service | Purpose |
|---|---|---|---|
| `SUPABASE_URL` | `http://127.0.0.1:54321` | Judge Worker | Target database for fetching canonical test suites |
| `SUPABASE_SERVICE_ROLE_KEY` | `""` | Judge Worker | High-privilege key to bypass RLS and fetch hidden test cases |
| `SUPABASE_ANON_KEY` | `""` | Judge Worker | Fallback key if service role is absent |
| `JUDGE_HTTP_HOST` | `127.0.0.1` | Judge HTTP Server | Host binding address |
| `JUDGE_HTTP_PORT` | `8080` | Judge HTTP Server | Port listening for execution jobs |
| `WORKER_ID` | `judge-worker-1` | Judge Worker | Worker identifier emitted in health and logs |
| `WORKER_CONCURRENCY` | `8` | Thread Pool | Size of thread execution pool |
| `POLL_INTERVAL_SECONDS` | `1.0` | Queue Poller | Frequency of polling `submissions` table |
| `MAX_CPU_TIME_SECONDS` | `2.0` | Execution Runner | Base timeout per test case execution |
| `MAX_MEMORY_MB` | `256` | Execution Runner | Memory allocation threshold |
| `COMPILATION_CACHE_ENABLED` | `true` | Compiler Cache | Toggle for binary caching |
| `COMPILATION_CACHE_DIR` | `../.cache` | Compiler Cache | Directory storing precompiled binaries |
| `COMPILATION_CACHE_MAX_ENTRIES`| `500` | Compiler Cache | Maximum LRU entries retained on disk |

### 3. AI Service Configuration (`backend/ai/` / `backend/authoring/`)
| Variable Name | Required | Service | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Optional | Problem Authoring | API key for Claude 3.5 Sonnet draft generation |
| `GEMINI_API_KEY` | Optional | Problem Authoring | API key for Gemini 1.5 Pro draft generation |
| `OPENAI_API_KEY` | Optional | AI Service (Planned) | Key for RAG embeddings and code review |

---

## Infrastructure, Hosting & Deployment Architecture

```mermaid
graph TD
    User([Student Browser])
    VercelEdge([Vercel Edge Network])
    SupaCloud([Supabase Cloud Platform])
    JudgeVM([Judge Worker Host / VPS])

    User -->|HTTPS :443| VercelEdge
    VercelEdge -->|Serves Static SPA| User
    User -->|PostgREST / WSS Realtime| SupaCloud
    User -->|Direct HTTP POST :8080| JudgeVM
    JudgeVM -->|Fetch Hidden Tests (service_role)| SupaCloud
```

### Hosting Environments
1. **Frontend:**
   - Hosted on **Vercel** (`https://verniq.vercel.app`).
   - SPA routing configured via `frontend/vercel.json` rewriting `/(.*)` to `/index.html`.
   - Vercel Web Analytics injected via `@vercel/analytics/react`.
2. **Database & Auth:**
   - Hosted on **Supabase Managed Cloud** (`cisddayhekkktcomnqhz.supabase.co`).
   - Managed PostgreSQL 15+ instance with auto-backups and GoTrue auth.
3. **Judge Execution Worker:**
   - Designed to run either via Docker container (`backend/judge/Dockerfile`) or on a standalone Linux VM / VPS listening on port 8080.
   - In local development, runs natively on the Windows host.

---

## Docker & Container Specifications

### `docker/docker-compose.yml`
[`docker/docker-compose.yml`](file:///c:/Users/LOQ/Desktop/VERNIQ/docker/docker-compose.yml) defines two core backend services:
- `ai-service`: Builds from `../backend/ai/Dockerfile`, binds to `8000:8000`.
- `judge-worker`: Builds from `../backend/judge/Dockerfile`, configures resource flags and joins network.

### `backend/judge/Dockerfile`
[`backend/judge/Dockerfile`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/Dockerfile):
- Base image: `ubuntu:24.04`.
- Preinstalls GCC 14, G++ 14, OpenJDK 21, Python 3.12, Node.js 20, npm, tsx, and Go 1.22.
- Creates unprivileged user `sandboxuser`.
- Entrypoint: `CMD ["python3", "-m", "src.worker"]`.

---

## CI/CD, Monitoring & Operational Gaps

1. **Continuous Integration (CI):**
   - **Status:** [MISSING]
   - No GitHub Actions workflows exist in `.github/workflows/`.
   - Pull requests and commits are not automatically tested, type-checked, or linted prior to merging.
2. **Continuous Deployment (CD):**
   - **Frontend:** Vercel git-integration deploys automatically on branch push.
   - **Backend / Judge:** No automated deployment pipeline exists for the judge worker or migrations.
3. **Observability & Logging:**
   - **Judge:** Standard Python `logging.StreamHandler` outputting to stdout. No Datadog, Sentry, or Prometheus integration.
   - **Frontend:** Basic browser console error logging; Vercel Analytics tracking pageviews only.
4. **Database Backups:**
   - Relies entirely on Supabase automated daily platform snapshots. No custom dump scripts or point-in-time recovery (PITR) configuration in repository.
