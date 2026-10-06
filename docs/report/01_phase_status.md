# 01 — Phase Status

## Current Phase: Phase 3.5 / 4 (Judge + Dashboard fully operational; AI and payments not started)

The project uses an internal phasing system visible in comments across the codebase (e.g. "Phase 2", "Phase 3", "Phase 4", "Phase 5" referenced in WorkspaceSubView descriptions in App.tsx lines 253-376).

---

## Phase Status Table

| Phase | Name | Goal | Status | Key Files | Working | Missing |
|---|---|---|---|---|---|---|
| 0 | Foundation | Repo structure, design system, auth, types, Supabase baseline | [DONE] | frontend/src/types/index.ts, frontend/src/lib/supabaseClient.ts, frontend/src/hooks/useAuth.tsx, frontend/src/components/ui/, docs/database/database-conventions.md | Auth flows, design system, route shell, type definitions | Migration files not in repo |
| 1 | Problem Catalog | Problems table, public listing, filtering, pagination | [DONE] | frontend/src/routes/ProblemsView.tsx, frontend/src/hooks/useProblems.ts, frontend/src/lib/curriculumData.ts | 3,392 problems fetched from Supabase in 4 parallel batches; local fallback dataset; filtering by difficulty/domain/tag/status/workflow; pagination (50/page) | No server-side filtering; full dataset fetched client-side |
| 2 | Problem Workspace | Monaco editor, code execution, autosave, problem detail | [DONE] | frontend/src/components/workspace/ProblemWorkspace.tsx (39KB), frontend/src/components/workspace/TestCaseConsole.tsx (37KB), frontend/src/lib/draftService.ts, frontend/src/hooks/useAutosave.ts | Monaco editor, language switching, run code, submit, sample test results, autosave (localStorage + Supabase), submission history | Submission history list view is partial; no share-solution feature |
| 2.5 | Standalone IDE | Multi-tab scratchpad, run code, no problem context | [DONE] | frontend/src/routes/StandaloneIdeView.tsx (33KB), frontend/src/lib/ideDraftService.ts | 5 languages, multi-tab, autosave (localStorage), beforeunload flush, autosave status badge | No Supabase persistence for IDE state; anonymous only |
| 3 | Judge Worker | Code execution sandbox, harness injection, verdict, telemetry | [DONE] | backend/judge/src/worker.py, backend/judge/src/runner/sandbox.py, backend/judge/src/runner/harness.py (80KB), backend/judge/src/runner/profiles.py, backend/judge/src/runner/cache.py | HTTP server on :8080, /execute and /cancel endpoints, compilation cache, 5 languages, canonical test suite loading, telemetry, cancellation registry | No seccomp/cgroup sandbox on Linux; CORS = wildcard; memory measurement is simulated not actual |
| 3.5 | Dashboard | User home with sprint, POTD, revision, streak | [DONE] | frontend/src/routes/DashboardView.tsx | Active sprint banner, today's tasks, revision queue, streak display, campus rank estimate | Campus rank is a formula estimate not a real DB rank; POTD points not awarded |
| 4 | StudyPlan / SprintPlan | Personalized study plan generator, sprint management | [PARTIAL] | frontend/src/routes/StudyPlanView.tsx (59KB), frontend/src/routes/SprintPlanView.tsx (24KB) | Plan creation wizard with 4 goal types, daily schedule view, task completion, sprint CRUD via Supabase | Study plan generation algorithm is pure frontend JS with no backend AI; no external curriculum input |
| 4.5 | Diagnostic Assessment | MCQ skill assessment across 10+ DSA categories | [PARTIAL] | frontend/src/routes/DiagnosticView.tsx (33KB) | 20 hardcoded questions, scoring, confidence-level calculation, results display | Questions are static (hardcoded); results not persisted to Supabase user_diagnostics table in current flow |
| 4.6 | Leaderboard | Global and campus-league rankings | [PARTIAL] | frontend/src/routes/LeaderboardView.tsx (22KB), frontend/src/lib/colleges.ts | Real Supabase profiles fetched and ranked by score; global tab works | Campus league aggregation is built from seeded colleges data (frontend/src/lib/colleges.ts), not a real DB query; no pagination |
| 5 | Roadmaps | Structured learning path viewer | [PARTIAL] | frontend/src/routes/RoadmapsView.tsx (12KB), frontend/src/hooks/useRoadmap.ts | Roadmap list and step drill-down via Supabase; fallback static data | Step-to-problem associations may have sparse data; no progress tracking per roadmap step |
| 5.5 | RevisionView | Spaced-repetition review queue | [PARTIAL] | frontend/src/routes/RevisionView.tsx (33KB) | Review queue from Supabase user_revision_items; card-flip UI; mark as reviewed | No automated SRS interval calculation; intervals are manually adjustable |
| 6 | CodeSpace / NoteSpace | Personal code vault and markdown notes | [DONE] | frontend/src/routes/CodeSpaceView.tsx (26KB), frontend/src/routes/NoteSpaceView.tsx (30KB) | CRUD for user_codespaces and user_notes tables; Monaco editor for code, markdown editor for notes; pin, star, search | No sharing, no version history |
| 7 | ProblemAuthoring CMS | Problem content authoring, provenance review, technical review | [PARTIAL] | frontend/src/routes/ProblemAuthoringView.tsx (63KB), frontend/src/components/authoring/ | Full 7-step workflow UI (draft -> content_authoring -> content_review -> technical_review -> provenance_review -> judge_ready -> published), revision history, provenance sources, 9-point technical review checklist | AI-assisted authoring is UI-only; batch operations are UI-only; no backend AI endpoint connected |
| 8 | Profile / Settings | User profile and preferences | [DONE] | frontend/src/routes/ProfileView.tsx (5.9KB), frontend/src/routes/ProfileSettingsView.tsx (21KB) | Avatar display, stats, edit fields, preferred language, tab size, college affiliation, social links | No avatar upload; GitHub and LeetCode username not verified |
| 9 | Foundation / Architecture Pages | Public docs pages | [DONE] | frontend/src/routes/FoundationView.tsx, frontend/src/routes/ArchitectureView.tsx | Static informational pages | Pure static content, no CMS |
| 10 | AI Mentor | Socratic AI mentorship via FastAPI + pgvector | [PLANNED] | backend/ai/README.md, backend/ai/requirements.txt | Nothing | Entire FastAPI service; prompts; RAG pipeline; SSE streaming; JWT validation |
| 11 | Mock Interview | Interactive technical interview simulation | [PLANNED] | None | Nothing | Entire feature |
| 12 | Payments / Subscriptions | Premium plan checkout, subscription management | [PLANNED] | None | Nothing | Razorpay or Stripe integration; pricing page; webhook; plan enforcement |
| 13 | Contests | Real-time competitive programming rounds | [PLANNED] | App.tsx line 337-350 (placeholder route) | WorkspaceSubView placeholder only | Entire feature |
| 14 | Community / Forums | Discussion boards, question threads | [PLANNED] | None | Nothing | Entire feature |
| 15 | Admin Panel | Role management, system health monitoring, CMS | [PLANNED] | App.tsx line 391-404 (placeholder behind AdminRoute) | AdminRoute auth check works (checks profile.role === admin) | Actual admin UI; telemetry dashboard; user management |

---

## What Phase Is the Project At?

The project is at **Phase 7 (Content Authoring CMS)** in terms of the highest milestone touched, but core infrastructure is at **Phase 3-4**. Many features beyond Phase 6 are either placeholder UI or completely absent.

The most critical gap between "stated goals" and "actual code" is:
- The AI Mentor (Phase 10) which is the platform's primary differentiator has ZERO implementation.
- Payments (Phase 12) which is required for monetization has ZERO implementation.
