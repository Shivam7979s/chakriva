# 16 - AI Handoff Executive Briefing & Knowledge Base

## AI Handoff Briefing (Max 2 Pages)

> **Purpose:** This briefing is specifically formatted for an incoming AI engineering assistant receiving this codebase with zero prior context. It provides a complete, grounded summary of facts, boundaries, and priorities.

---

### 1. What the Project Is
**VERNIQ** is a full-stack engineering education platform tailored for Indian software engineering students preparing for top-tier product placements (FAANG/MAANG, Indian unicorns) and GATE.
It combines:
- A curated catalog of 3,392 Data Structures & Algorithms (DSA) problems.
- An isolated multi-language code judge (Python, C++, Java, TypeScript, Go).
- Structured roadmaps, weekly adaptive sprint planners, and spaced repetition revision.
- Student workspace utilities: multi-file Cloud CodeSpace, Markdown NoteSpace, and campus-league leaderboards.

---

### 2. What Is Truly Working End-to-End
- **Frontend SPA Deployment:** Live on Vercel at `https://verniq.vercel.app` with dark-themed, responsive Tailwind UI.
- **Authentication:** Email/password and GitHub OAuth via Supabase GoTrue; automatic profile provisioning via PostgreSQL triggers.
- **Problem Catalog & Filtering:** 3,392 problems in Supabase with fast client pagination, difficulty/domain filters, and search.
- **Problem Workspace & Standalone IDE:** Monaco Editor with syntax highlighting, autosave recovery across refreshes, custom test case console, and multi-file code editing.
- **Code Judge Execution:** Low-latency runner supporting 5 languages with compilation caching, automatic AST harness injection, and standard verdict resolution.
- **Campus & Global Leaderboards:** Live PostgreSQL views ranking individual students and engineering institutions.
- **Database Schema:** 39 relational tables and strict RLS policies across all migrations in `backend/supabase/migrations/`.

---

### 3. What Is NOT Working (Mocks, Stubs & Missing Features)
- **AI Mentorship & Mock Interviews:** `backend/ai/` contains **zero code** (only README/requirements). `/app/ai-mentor` is a placeholder card.
- **Payments & Subscriptions:** Completely absent (0% implemented). No Razorpay/Stripe SDKs, no `/pricing` route, no subscription tables.
- **Contests & Community Forums:** 0% implemented; `/app/contests` routes to a placeholder view.
- **Judge Sandboxing:** No network isolation or cgroups memory limits; untrusted code runs directly via `subprocess.Popen`.
- **Frontend Testing:** No test runner installed in `frontend/package.json` (`npm test` does not work).
- **Automated CI/CD:** No GitHub Actions test workflows exist.

---

### 4. Key Files to Know
| File Path | Role & Importance |
|---|---|
| [`frontend/src/lib/supabaseClient.ts`](file:///c:/Users/LOQ/Desktop/VERNIQ/frontend/src/lib/supabaseClient.ts) | Public Supabase client instance (contains hardcoded fallback credentials). |
| [`frontend/src/lib/submissionService.ts`](file:///c:/Users/LOQ/Desktop/VERNIQ/frontend/src/lib/submissionService.ts) | Client-side coordinator for running and submitting code against judge worker. |
| [`frontend/src/hooks/useAuth.tsx`](file:///c:/Users/LOQ/Desktop/VERNIQ/frontend/src/hooks/useAuth.tsx) | Central authentication provider, session listener, and profile state. |
| [`frontend/src/routes/index.tsx`](file:///c:/Users/LOQ/Desktop/VERNIQ/frontend/src/routes/index.tsx) | Complete React Router route registry (26 routes). |
| [`backend/judge/src/worker.py`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/worker.py) | Main HTTP execution server (:8080) and Supabase submission queue poller. |
| [`backend/judge/src/runner/sandbox.py`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/runner/sandbox.py) | Core compiler, runner, process executor, and timeout enforcement. |
| [`backend/judge/src/runner/harness.py`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/judge/src/runner/harness.py) | 80KB AST driver injector for LeetCode-style solution snippets across 5 languages. |
| [`backend/supabase/migrations/`](file:///c:/Users/LOQ/Desktop/VERNIQ/backend/supabase/migrations/) | Canonical source of truth for all 39 database tables, triggers, and RLS policies. |

---

### 5. Key Decisions Already Made
1. **Client-Direct Architecture:** The frontend connects directly to PostgreSQL via Supabase PostgREST rather than routing through an intermediary Node/Express backend.
2. **Dual-Mode Code Judge:** The judge operates both as a low-latency HTTP microservice for interactive testing (`POST /execute`) and an asynchronous poller for queued submissions.
3. **Canonical Test Protection:** Sample test cases are publicly queryable, but full test suites are protected by RLS; the judge fetches hidden tests via `SUPABASE_SERVICE_ROLE_KEY`.
4. **Compilation Caching:** Binaries are fingerprinted with SHA-256 and cached on disk to eliminate compiler startup overhead.
5. **No TODO Comments:** Developers used visual UI alert banners and `WorkspaceSubView` stubs rather than `// TODO` comments to track incomplete work.

---

### 6. Top 3 Risks
1. **Judge Remote Code Execution / Host Compromise:** Untrusted code runs without network isolation or dropped privileges.
2. **Credential Exposure:** Live Supabase production credentials committed to frontend source code.
3. **Supply Chain Risk:** Missing frontend `package-lock.json` exposes deployments to floating dependency vulnerabilities.

---

### 7. What Phase to Build Next
- **Phase A (Immediate Security Fixes):** Harden judge execution with `--network none` containerization, authenticate judge HTTP API, purge hardcoded keys, generate lockfile.
- **Phase B (Monetization):** Integrate Razorpay payment flow, publish legal pages (`/pricing`, `/privacy`, `/terms`, `/refunds`), and enforce `is_premium` access checks.
- **Phase C (AI Activation):** Implement minimal FastAPI AI service in `backend/ai/` streaming Socratic hints via SSE.

---

## Questions I Could Not Answer From the Code

1. **Production Judge Deployment Host:**
   Where is the live judge worker hosted for the deployed Vercel site (`https://verniq.vercel.app`)? In production, does Vercel connect to a remote VPS running the Docker container, or is live code execution currently unreachable from Vercel?
2. **Supabase Cloud Project Administration:**
   Are all 14 migrations in `backend/supabase/migrations/` fully applied to the cloud instance (`cisddayhekkktcomnqhz.supabase.co`), or has the cloud database experienced manual schema edits in the Supabase web console?
3. **Planned Payment Commercial Terms:**
   What are the exact pricing tiers intended for the Indian market (e.g. ₹499/month vs ₹999/month), and is an Indian GSTIN already registered for Razorpay merchant onboarding?
4. **Intended LLM Provider & Budget:**
   Is Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro, or a locally hosted model (Ollama) preferred for the Socratic AI mentor, and what is the target token budget per student?
