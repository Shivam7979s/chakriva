# 00 — Executive Summary

## What Is VERNIQ?

VERNIQ is a full-stack engineering learning and career acceleration platform targeting aspiring Software Development Engineers (SDEs) in India.
It combines:
- A curated 3,392-problem DSA catalog with an isolated online code judge
- Structured roadmaps, weekly sprint planners, and spaced-revision review
- A diagnostic skills assessment engine
- A Cloud CodeSpace (multi-file personal code vault) and NoteSpace (markdown notes)
- A Leaderboard with individual and campus-league rankings
- A Problem Authoring and CMS pipeline for curated problem ingestion
- A planned (not yet built) Socratic AI Mentor and Mock Interview Engine

**Target Users:** B.Tech / MCA students preparing for product SDE roles, FAANG/top-tier placements, campus placement drives, and GATE.

---

## Overall Completion Estimate: ~38%

| Area | Status | Rationale |
|---|---|---|
| Landing, Auth, Public pages | 90% | Fully working end-to-end |
| Problem catalog and filtering | 85% | Supabase-backed, 3,392 problems, live |
| Code Judge (run + submit) | 75% | Full harness, 5 languages, no Docker network isolation on Windows |
| Problem Workspace (Monaco editor) | 80% | Full UI + autosave + submission pipeline |
| Standalone IDE | 85% | Autosave fixed (latest commit), multi-tab, 5 languages |
| Dashboard | 75% | Sprint, revision, POTD all wired |
| StudyPlan / SprintPlan | 65% | Functional but AI-generated plan is frontend-only algorithm |
| DiagnosticView | 70% | 20 hardcoded MCQs; no backend persistence of results |
| Leaderboard | 70% | Real Supabase data; campus league uses seeded static data |
| Roadmaps | 50% | Frontend viewer exists; backend data sparse |
| CodeSpace / NoteSpace | 75% | CRUD complete; cloud sync works |
| ProblemAuthoring CMS | 60% | Full UI pipeline; batch operations not connected to AI backend |
| AI Mentor | 2% | Architecture README only; FastAPI service = requirements.txt and README skeleton |
| Mock Interview | 0% | Not started |
| Payments / Subscriptions | 0% | Not started; no Razorpay/Stripe integration present |
| Contests | 0% | WorkspaceSubView placeholder only |
| Community / Forums | 0% | Not started |
| Admin Panel | 5% | WorkspaceSubView placeholder behind AdminRoute |

---

## Tech Stack (exact versions from frontend/package.json and backend/*/requirements.txt)

### Frontend (frontend/package.json)
| Package | Version |
|---|---|
| react | ^18.3.1 |
| react-dom | ^18.3.1 |
| react-router-dom | ^6.28.1 |
| @supabase/supabase-js | ^2.49.1 |
| @monaco-editor/react | ^4.7.0 |
| lucide-react | ^1.16.0 |
| tailwindcss | ^3.4.17 |
| clsx | ^2.1.1 |
| tailwind-merge | ^2.6.0 |
| typescript | ^5.7.3 |
| vite | ^6.0.11 |
| @vitejs/plugin-react | ^4.3.4 |

### Backend Judge Service (backend/judge/requirements.txt)
| Package | Version |
|---|---|
| supabase | >=2.0.0 |
| pydantic | >=2.0.0 |
| python-dotenv | >=1.0.0 |
| psutil | >=5.9.0 |
| requests | >=2.31.0 |

### Backend AI Service (backend/ai/requirements.txt)
| Package | Version |
|---|---|
| fastapi | >=0.110.0,<1.0.0 |
| uvicorn[standard] | >=0.28.0,<1.0.0 |
| pydantic | >=2.6.0,<3.0.0 |
| pydantic-settings | >=2.2.0,<3.0.0 |
| httpx | >=0.27.0,<1.0.0 |
| python-jose[cryptography] | >=3.3.0,<4.0.0 |
| pgvector | >=0.2.5,<0.3.0 |
| psycopg2-binary | >=2.9.9,<3.0.0 |
| numpy | >=1.26.0,<2.0.0 |

### Infrastructure
- **Database:** PostgreSQL 16 via Supabase managed cloud
- **Auth:** Supabase Auth (email+password, GitHub OAuth)
- **Hosting:** Vercel (frontend SPA) + self-hosted or cloud VM (judge worker)
- **Judge Docker base:** ubuntu:24.04 with GCC 14, OpenJDK 21, Python 3.12, Node.js 20 + tsx, Go 1.22

---

## Repository Structure (2-3 levels)

```
VERNIQ/
+-- .env                     # Root env (Supabase URL + keys, judge config)
+-- .env.example             # Template (5 vars documented)
+-- .gitignore
+-- README.md
+-- package.json             # Workspace root
+-- package-lock.json
+-- backend/
¦   +-- ai/                  # AI FastAPI microservice (PLANNED - skeleton only)
¦   ¦   +-- requirements.txt
¦   ¦   +-- README.md
¦   +-- authoring/           # Problem authoring tooling (empty)
¦   +-- importer/            # Problem importer (empty)
¦   +-- judge/               # Online Judge Worker (ACTIVE)
¦   ¦   +-- .env             # Judge-specific env
¦   ¦   +-- Dockerfile       # ubuntu:24.04, sandboxuser
¦   ¦   +-- requirements.txt
¦   ¦   +-- load_test.py
¦   ¦   +-- measure_baseline.py
¦   ¦   +-- src/
¦   ¦   ¦   +-- config.py       # JudgeConfig Pydantic model
¦   ¦   ¦   +-- worker.py       # HTTP server + Supabase poller
¦   ¦   ¦   +-- runner/
¦   ¦   ¦       +-- cache.py
¦   ¦   ¦       +-- comparator.py
¦   ¦   ¦       +-- harness.py  # Language-specific driver injection (~2,600 lines)
¦   ¦   ¦       +-- profiles.py
¦   ¦   ¦       +-- sandbox.py
¦   ¦   +-- tests/
¦   ¦       +-- test_all_verdicts.py
¦   ¦       +-- test_judge_performance.py
¦   +-- roadmap/             # Roadmap tooling (empty)
¦   +-- supabase/            # Empty
+-- data/                    # Problem import data files
+-- docker/                  # Docker compose (not confirmed)
+-- docs/
¦   +-- database/
¦   ¦   +-- database-conventions.md
¦   +-- reports/
+-- frontend/
¦   +-- .env
¦   +-- vercel.json          # SPA rewrite rule
¦   +-- package.json
¦   +-- src/
¦       +-- App.tsx           # BrowserRouter + all routes (421 lines)
¦       +-- main.tsx          # React entry, AuthProvider, ThemeProvider, ToastProvider
¦       +-- components/
¦       ¦   +-- auth/         # ProtectedRoute, AdminRoute
¦       ¦   +-- authoring/    # ProductionDashboardTab, AuthoringQueueTab
¦       ¦   +-- dashboard/    # ActiveSprintBanner, ProblemOfTheDayCard, etc.
¦       ¦   +-- editor/       # MonacoCodeEditor wrapper
¦       ¦   +-- landing/      # LandingHeader, LandingCockpitMockup
¦       ¦   +-- learning/     # DifficultyBadge
¦       ¦   +-- planner/      # SprintCard, RebalanceModal
¦       ¦   +-- ui/           # Design system (actions, data, feedback, forms, layout, navigation)
¦       ¦   +-- workspace/    # ProblemWorkspace, TestCaseConsole, SplitPane
¦       +-- hooks/            # useAuth, useProblems, useUserProgress, useUserTelemetry, useRoadmap, useAutosave, useSubmissionRealtime, useProblemBySlug
¦       +-- lib/              # supabaseClient, submissionService, draftService, ideDraftService, curriculumData, colleges, utils
¦       +-- routes/           # 26 page view files
¦       +-- tests/            # autosave.test.ts, ideAutosave.test.ts
¦       +-- types/            # index.ts (620 lines)
+-- packages/                # Empty monorepo packages dir
+-- supabase/
    +-- .temp/               # Gitignored
```

> **CRITICAL NOTE:** No supabase/migrations/ directory is present in the local checkout.
> All schema lives only in the Supabase cloud dashboard - not version-controlled in this repo.

---

## Key Observations for the Receiving AI

1. **Supabase URL and anon key are hardcoded** in frontend/src/lib/supabaseClient.ts (lines 8 and 14) as string literals. The real production Supabase URL (cisddayhekkktcomnqhz.supabase.co) and a sb_publishable key are committed to source code. CRITICAL SECURITY FINDING.

2. The **judge runs without OS-level sandboxing** on Windows. On Linux (Docker), it uses sandboxuser but no seccomp, cgroups, or network namespace isolation.

3. **No migration files** exist in the repo. Schema drift risk is HIGH.

4. **AI service** (backend/ai/) has zero implementation - only a README and requirements.txt.

5. **Payments, contests, community** are entirely absent from the codebase.

6. The frontend is a **production-deployed SPA** on Vercel at https://verniq.vercel.app.

7. **CORS on judge worker** is set to Allow-Origin: * (wildcard), meaning anyone can call the judge HTTP API directly.
