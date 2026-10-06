# 04 — Features

---

## 1. DSA Problem Practice

### Description
Users can browse a catalog of 3,392 DSA problems organized by difficulty, domain, and topic tags. Each problem has a dedicated workspace with a Monaco code editor.

### User Flow
1. Navigate to /problems
2. Filter by difficulty/domain/tag/status
3. Click problem title -> /problems/:slug
4. Read problem description, constraints, examples
5. Write solution in Monaco editor (language selector)
6. Click "Run Code" -> executes against sample test cases
7. Click "Submit" -> executes against full canonical test suite
8. View verdict and test case results

### Frontend Files
- frontend/src/routes/ProblemsView.tsx - catalog list
- frontend/src/components/workspace/ProblemWorkspace.tsx - workspace
- frontend/src/components/workspace/TestCaseConsole.tsx - results panel
- frontend/src/components/workspace/SplitPane.tsx - layout
- frontend/src/hooks/useProblems.ts - data fetching
- frontend/src/hooks/useProblemBySlug.ts - detail fetching
- frontend/src/hooks/useUserProgress.ts - solve status
- frontend/src/lib/draftService.ts - autosave

### Backend Files
- backend/judge/src/worker.py - HTTP server + Supabase poller
- backend/judge/src/runner/sandbox.py - execution
- backend/judge/src/runner/harness.py - driver injection
- backend/judge/src/runner/profiles.py - language profiles

### DB Tables
- problems (catalog)
- test_cases (sample + canonical)
- submissions (verdict history)
- user_problem_progress (solved/attempted status)
- problem_code_drafts (cloud draft autosave)

### Business Rules
- Run Code: executes with stdin only; no canonical test cases; no auth required
- Submit: loads canonical test cases from Supabase using service_role key (backend only); requires user auth for persistence
- verdict persistence is async/background; does not block UI
- First accepted submission upserts user_problem_progress with status='solved'

### Status: [DONE] for run and submit; [PARTIAL] for submission history list

---

## 2. Online Code Judge

### Description
Python-based HTTP judge worker that compiles and runs user code against test cases in isolated temp directories.

### User Flow
1. Frontend calls POST /execute on judge worker
2. Worker injects harness (driver code) around user's solution
3. Compiles if necessary (Java, C++)
4. Runs each test case sequentially via subprocess
5. Compares output; returns structured JSON result

### Frontend Files
- frontend/src/lib/submissionService.ts - runCode(), submitSolution()

### Backend Files
- backend/judge/src/worker.py - HTTP handler
- backend/judge/src/runner/sandbox.py - SandboxRunner.execute()
- backend/judge/src/runner/harness.py - inject_harness()
- backend/judge/src/runner/profiles.py - LanguageProfile
- backend/judge/src/runner/cache.py - CompilationCache
- backend/judge/src/runner/comparator.py - compare_outputs()

### Supported Languages
| Language | Compile | Run | Time Multiplier |
|---|---|---|---|
| C++ | g++ -O2 -std=c++17 | ./solution | 1.0x |
| Java | javac | java -XX:+TieredCompilation -XX:TieredStopAtLevel=1 -Xmx256m -Xss64m | 1.5x |
| Python | none | python3 -u solution.py | 2.0x |
| TypeScript | none | node --experimental-strip-types solution.ts | 1.5x |
| Go | none | go run main.go | 1.5x |

### Verdicts
accepted, wrong_answer, time_limit_exceeded, memory_limit_exceeded, compilation_error, runtime_error, cancelled, internal_error

### Status: [DONE] - Note: memory measurement is SIMULATED (formula: min(duration_ms * 45 + 1420, max_mb * 1024)), not actual process memory

---

## 3. Autosave (Problem Workspace)

### Description
Dual-layer persistence: localStorage (instant) + Supabase cloud (async). Scoped by (user, problem, language).

### Frontend Files
- frontend/src/lib/draftService.ts - getLocalDraft(), saveLocalDraft(), loadCloudDraft(), saveCloudDraft()
- frontend/src/hooks/useAutosave.ts - 500ms debounced autosave hook
- frontend/src/components/workspace/ProblemWorkspace.tsx - SaveStatus badge

### DB Tables
- problem_code_drafts

### Business Rules
- Debounced 500ms for typing
- Immediate flush on beforeunload
- Anonymous drafts migrate to user-scoped keys on login
- Stale revision guard prevents old saves overwriting newer ones

### Status: [DONE]

---

## 4. Standalone IDE

### Description
Multi-tab scratchpad IDE with no problem context. Code persists to localStorage.

### Frontend Files
- frontend/src/routes/StandaloneIdeView.tsx
- frontend/src/lib/ideDraftService.ts

### Business Rules
- Up to N tabs (no limit enforced)
- Each tab has: id, title, language, code, stdin
- State scoped by userId or 'anonymous'
- 500ms debounced autosave; immediate on structural changes

### Status: [DONE] (autosave just fixed)

---

## 5. Spaced Revision System

### Description
Users bookmark problems for later review. Review queue shows items due based on next_review_at date.

### Frontend Files
- frontend/src/routes/RevisionView.tsx
- frontend/src/hooks/useUserProgress.ts (toggleRevision)

### DB Tables
- user_revision_items (user_id, problem_id, interval_days, next_review_at, is_reviewed)

### Business Rules
- Bookmark adds item to user_revision_items with interval_days=1
- User manually adjusts interval from revision view ("Too Easy" increases, "Struggled" resets)
- No automatic SM-2 or Anki algorithm implemented

### Status: [PARTIAL] - Manual interval only; no automated SRS

---

## 6. Study Plan Generator

### Description
Generates a 30-day personalized study schedule by distributing problems across days based on goal type and daily minutes.

### Frontend Files
- frontend/src/routes/StudyPlanView.tsx (59KB)

### DB Tables
- user_study_plans
- user_study_plan_tasks

### Business Rules
- 4 goal templates: product_sde, faang_top_tier, core_cs_foundations, campus_placement
- Difficulty ratios per goal (e.g., faang: 20% easy, 60% medium, 20% hard)
- Problems selected from full problem catalog filtered by difficulty ratio
- Distribution is pure frontend JS - no AI involved despite UI suggesting "AI-Generated"

### Status: [PARTIAL] - Functional but labeled "AI-Generated" when it is a deterministic algorithm

---

## 7. Sprint Plan

### Description
Weekly sprint management: 7-day focused practice sprints with specific daily tasks.

### Frontend Files
- frontend/src/routes/SprintPlanView.tsx
- frontend/src/components/planner/SprintCard.tsx
- frontend/src/components/planner/RebalanceModal.tsx

### DB Tables
- study_sprints
- sprint_tasks

### Status: [PARTIAL] - Task completion and week navigation work; rebalance modal is UI

---

## 8. Diagnostic Assessment

### Description
20-question MCQ test to assess DSA skill levels across categories. Returns mastery scores per category.

### Frontend Files
- frontend/src/routes/DiagnosticView.tsx (33KB)

### DB Tables
- user_diagnostics (attempts upsert on completion)

### Business Rules
- 20 hardcoded questions across: Arrays, Two Pointers, Sliding Window, Binary Search, Linked Lists, Stacks/Queues, Trees, Graphs, Dynamic Programming, Greedy
- Scores confidence_level: novice (<40%), intermediate (40-69%), proficient (70-84%), master (85%+)
- Results displayed with per-category bars and overall score

### Status: [PARTIAL] - Works end-to-end but questions are static; persistence to user_diagnostics is inconsistent

---

## 9. Leaderboard

### Description
Global and campus-league rankings.

### Frontend Files
- frontend/src/routes/LeaderboardView.tsx
- frontend/src/lib/colleges.ts

### DB Tables
- profiles (global leaderboard)
- colleges (campus league - mostly seeded data)

### Status: [PARTIAL] - Global works; campus uses seeded static data; no pagination

---

## 10. Roadmaps

### Description
Structured learning paths with steps, topics, and linked problems.

### Frontend Files
- frontend/src/routes/RoadmapsView.tsx
- frontend/src/hooks/useRoadmap.ts

### DB Tables
- roadmaps
- roadmap_steps
- roadmap_topics
- roadmap_topic_problems (junction)
- problems

### Status: [PARTIAL] - UI complete; actual roadmap content data density in Supabase unknown

---

## 11. CodeSpace (Cloud Code Vault)

### Description
Personal multi-file code vault stored in Supabase. Users save code snippets with language, title, stdin, tags.

### Frontend Files
- frontend/src/routes/CodeSpaceView.tsx (26KB)

### DB Tables
- user_codespaces

### Business Rules
- CRUD operations; pin toggle; tag management; Monaco editor per entry
- Can open saved codespace in IDE via navigation with state

### Status: [DONE]

---

## 12. NoteSpace (Markdown Notes)

### Description
Personal markdown notes optionally linked to problems.

### Frontend Files
- frontend/src/routes/NoteSpaceView.tsx (30KB)

### DB Tables
- user_notes

### Status: [DONE]

---

## 13. Problem Authoring CMS

### Description
Internal CMS for problem creation, review, and publication pipeline. 7-step workflow from draft to published.

### Frontend Files
- frontend/src/routes/ProblemAuthoringView.tsx (63KB)
- frontend/src/components/authoring/ProductionDashboardTab.tsx
- frontend/src/components/authoring/AuthoringQueueTab.tsx

### DB Tables
- problems
- problem_content_revisions
- problem_provenance_sources
- problem_technical_reviews
- authoring_batches
- batch_problem_items

### Business Rules
- Workflow: draft -> content_authoring -> content_review -> technical_review -> provenance_review -> judge_ready -> published
- Technical review has 9-point checklist
- Provenance tracks IP/license for each source

### Status: [PARTIAL] - Full UI exists; AI-assisted authoring is placeholder; batch operations UI-only

---

## 14. Progress Tracking (Gamification)

### Description
Score tracking, streak counting, problems solved count.

### Frontend Files
- frontend/src/hooks/useUserTelemetry.ts (9.9KB)

### DB Tables
- profiles (score, problems_solved_count, current_streak, max_streak columns)
- user_problem_progress (for counting solved problems)

### Business Rules
- Score incremented on accepted submission (not visible in submissionService code - may be a Supabase trigger)
- Streak count tracked in profiles
- Campus rank is a formula estimate: max(1, 100 - floor(score/50))

### Status: [PARTIAL] - Score/streak may rely on DB triggers not visible in code

---

## Features NOT Implemented (Evidence from codebase)

| Feature | Evidence of Absence |
|---|---|
| AI Mentor | backend/ai/ has only README.md and requirements.txt; /app/ai-mentor is a placeholder |
| Mock Interview | No files; no route |
| Payments | No Razorpay/Stripe code anywhere; no /pricing route |
| Real-time Contests | /app/contests renders WorkspaceSubView placeholder |
| Community/Forums | No route, no component, no DB tables visible |
| Admin Panel | /app/admin renders WorkspaceSubView placeholder |
| Email Verification | No /verify-email route; no verification enforcement in ProtectedRoute |
| Password Reset | /reset-password route missing from App.tsx |
| File Upload / Avatar | No storage bucket usage found in frontend code |
| Notifications System | No notification tables or UI visible |
