# 03 — Frontend Pages

All routes are defined in frontend/src/App.tsx.

---

## 1. Landing Page (/)

- **File:** frontend/src/routes/LandingView.tsx (209 lines)
- **Access:** Public
- **Purpose:** Marketing/hero page; entry point for new users

### Sections (in order)
1. **Top Navigation** - LandingHeader component (links: Roadmaps, Problems, Leaderboard, IDE, Login/Dashboard)
2. **Hero Section** - H1 headline, subtitle, two CTAs ("Take Diagnostic Test" -> /app/diagnostic, "Open Standalone IDE" -> /ide)
3. **Trust bar** - Metric badges ("0.0s Sandbox Overhead", "256MB Hard Limits", etc.)
4. **Cockpit Mockup** - LandingCockpitMockup animated illustration
5. **Feature Cards** - Brain/Spaced Revision/Repeat icons with feature descriptions
6. **CTA Section** - "Start Your Engineering Sprint Today" + link to /register
7. **Footer** - Basic links

### Components Used
- LandingHeader (frontend/src/components/landing/LandingHeader.tsx)
- LandingCockpitMockup (frontend/src/components/landing/LandingCockpitMockup.tsx)
- lucide-react icons

### Status: [DONE]
No data fetching; fully static. Landing page renders immediately without any API calls.

---

## 2. Login Page (/login)

- **File:** frontend/src/routes/LoginView.tsx (8,517 bytes)
- **Access:** Public (redirects to /app/dashboard if already authenticated)
- **Purpose:** Email/password and GitHub OAuth login

### Sections
1. Left panel: VERNIQ branding, feature bullets
2. Right panel: Login form
   - Email input (type="email", required)
   - Password input (type="password", required, show/hide toggle)
   - "Forgot Password?" link -> /forgot-password
   - "Sign In" button -> useAuth.signInWithEmail()
   - Divider "or"
   - "Continue with GitHub" button -> useAuth.signInWithGitHub()
   - "Create Account" link -> /register

### Data Sources
- useAuth() - session state; if session exists, Navigate to /app/dashboard
- supabase.auth.signInWithPassword() called through useAuth
- supabase.auth.signInWithOAuth({ provider: 'github' })

### Error States
- Toast notification on auth failure with error message

### Status: [DONE]

---

## 3. Register Page (/register)

- **File:** frontend/src/routes/RegisterView.tsx (10,756 bytes)
- **Access:** Public
- **Purpose:** New user signup

### Sections
1. Registration form:
   - Full Name (text, required)
   - Username (text, required, lowercase letters/numbers/underscore)
   - Email (email, required)
   - Password (password, min 8 chars)
   - College selection (searchable dropdown from colleges.ts SEEDED_COLLEGES list)
   - "Create Account" button -> useAuth.signUpWithEmail()
   - "Sign In" link

### Interactions
- College search is client-side filter on SEEDED_COLLEGES array
- On success: navigate to /app/dashboard with welcome toast
- On error: inline error display + toast

### Status: [DONE] (no email verification enforcement shown in UI)

---

## 4. Forgot Password (/forgot-password)

- **File:** frontend/src/routes/ForgotPasswordView.tsx (4,985 bytes)
- **Access:** Public
- **Purpose:** Send password reset email

### Sections
- Email input + "Send Reset Link" button
- Calls supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })
- Success state: instructional message shown

### Status: [DONE] - Note: /reset-password route does NOT exist in App.tsx. The reset link will 404.

---

## 5. Problems List (/problems)

- **File:** frontend/src/routes/ProblemsView.tsx (26,786 bytes)
- **Access:** Public
- **Purpose:** Browse, filter, sort, and paginate the full problem catalog

### Sections (in order)
1. **PageHeader** - Title "Problem Catalog", subtitle
2. **Filter Bar** - Search input, Difficulty dropdown (all/easy/medium/hard), Domain dropdown (dynamic), Status dropdown (all/todo/attempted/solved), Workflow dropdown (all/published/draft), Tag dropdown (dynamic), "Revision Only" toggle, Sort controls
3. **Stats Bar** - Total problems count, filtered count, page info
4. **Problem Table** - verniq_id, title, difficulty badge, tags, acceptance rate, status icon, revision bookmark icon, link to /problems/:slug
5. **Pagination** - Prev/Next + First/Last buttons; 50 per page

### Data Sources
- useProblems(): fetches all problems from Supabase in 4 parallel batches (ranges 0-999, 1000-1999, 2000-2999, 3000-3999)
- useUserProgress(): user's solved/revision status per problem (requires auth; empty for anonymous)

### Loading States
- Spinner shown while fetching
- Falls back to FALLBACK_PROBLEMS from curriculumData.ts if Supabase fails

### Status: [DONE] - All filtering and sorting is client-side (full dataset loaded into memory)

---

## 6. Problem Workspace (/problems/:slug)

- **File:** frontend/src/components/workspace/ProblemWorkspace.tsx (39,461 bytes)
- **Access:** Public (run code works without auth; submit requires auth for persistence)
- **Purpose:** Core coding interface for a specific problem

### Sections (in order)
1. **Top Toolbar**
   - Problem title + difficulty badge
   - Language selector dropdown
   - Reset code button
   - Format code button
   - Copy code button
   - Download code button
   - Open file button
   - Share button
   - Fullscreen toggle
   - Autosave status badge (#autosave-status)
   - Submit button (primary CTA)
2. **Split Pane** - Left: Monaco editor (8 cols); Right: Problem description + test case console (4 cols)
3. **Left: Monaco Code Editor** - from MonacoCodeEditor component; language-aware; autosave on change
4. **Right: Problem description panel** (tabs: Description, Examples, Constraints, Submissions)
   - Description tab: problem statement in markdown (rendered as HTML)
   - Examples tab: sample input/output pairs
   - Constraints tab: constraint markdown
   - Submissions tab: submission history list
5. **Test Case Console** - TestCaseConsole.tsx (37KB) - Run Code / Submit tabs; verdict display; test case results; failed test case details; telemetry display

### Data Sources
- useProblemBySlug(slug): fetches full problem detail including starter_templates, test_cases (sample only), tags
- useAuth(): user session for submit persistence
- useAutosave(): localStorage + Supabase draft persistence
- submitSolution() / runCode() from submissionService.ts

### Status: [DONE] - Core path works; submission history tab is basic list

---

## 7. Standalone IDE (/ide)

- **File:** frontend/src/routes/StandaloneIdeView.tsx (33,281 bytes)
- **Access:** Public (no auth required)
- **Purpose:** Multi-tab scratchpad IDE for arbitrary code execution

### Sections
1. **Top Bar with Tab Strip** - Multi-tab management (add/close/switch); language selector; autosave badge; format/reset/copy/download buttons; Vault save button; Fullscreen toggle; Run Code button
2. **Monaco Editor** - Full-width left panel (65%)
3. **Right Panel** - Stdin input, execution output, telemetry

### Key Features (as of latest commit)
- Tabs persist across browser refresh via ideDraftService.ts (localStorage)
- beforeunload flush listener
- 5 languages: java, python, cpp, typescript, go
- Multi-tab: add/close tabs; state per tab

### Status: [DONE] (autosave just fixed in commit c5094fa)

---

## 8. Dashboard (/app/dashboard)

- **File:** frontend/src/routes/DashboardView.tsx (23,118 bytes)
- **Access:** Protected
- **Purpose:** Authenticated user home page

### Sections (in order)
1. **Command Greeting** - Time-sensitive greeting (morning/afternoon/evening)
2. **Stats Row** - Streak (from telemetry or profile), Problems Solved (from user_problem_progress count), Campus Rank (formula estimate), Score
3. **Active Sprint Banner** - ActiveSprintBanner component; shows current sprint name, end date, task completion progress; link to /app/plan
4. **Problem of the Day Card** - ProblemOfTheDayCard; fetches from problem_of_the_day table; shows title, difficulty, bonus points; "Solve Today's Problem" button -> /problems/:slug
5. **Today's Sprint Tasks** - List of tasks scheduled for today from sprint_tasks; checkmark completion
6. **Revision Due** - Items from user_revision_items where next_review_at <= today; "Review" button -> /app/revision
7. **Category Progress** - CategoryProgressModule; shows solved count by DSA category

### Data Sources
- useAuth(): profile, user
- useUserTelemetry(): streak, solve counts
- supabase.from('study_sprints'): active sprint
- supabase.from('sprint_tasks'): today's tasks
- supabase.from('user_revision_items'): due reviews
- supabase.from('problem_of_the_day'): POTD

### Status: [DONE] for core, [PARTIAL] for POTD (points not awarded on solve)

---

## 9. Study Plan (/app/study-plan)

- **File:** frontend/src/routes/StudyPlanView.tsx (59,547 bytes)
- **Access:** Protected
- **Purpose:** Generate and manage a personalized 30-day study schedule

### Sections
1. **Goal Selection** - 4 goal cards: Product SDE, FAANG/Top Tier, Core CS Foundations, Campus Placement
2. **Plan Configuration** - Target date picker, daily minutes slider
3. **Plan Calendar** - Weekly calendar grid view; problems scheduled per day; navigation
4. **Task List** - Today's tasks with status (pending/completed/skipped); complete/skip buttons
5. **Plan Summary** - Total problems, completion %, days remaining

### Interactions
- Plan generation: Pure frontend algorithm - filters FALLBACK_PROBLEMS or Supabase problems by difficulty ratios per goal, distributes over days
- Plan CRUD: supabase.from('user_study_plans') and supabase.from('user_study_plan_tasks')
- Task completion: updates user_study_plan_tasks.status

### Status: [PARTIAL] - Plan creation and task tracking work; plan generation is frontend-only with no AI

---

## 10. Sprint Plan (/app/plan)

- **File:** frontend/src/routes/SprintPlanView.tsx (24,544 bytes)
- **Access:** Protected
- **Purpose:** Manage active 7-day sprint with daily task view

### Sections
1. **Sprint Header** - Sprint name, dates, progress bar
2. **Week Navigation** - Prev/Next week arrows
3. **Daily Task Grid** - Days of the week; tasks per day; task cards
4. **Task Cards** - SprintCard component; problem title, type, estimated minutes, complete/skip buttons
5. **Rebalance Modal** - RebalanceModal component; redistribute incomplete tasks

### Data Sources
- supabase.from('study_sprints'): active sprint for user
- supabase.from('sprint_tasks'): all tasks for sprint with problem details

### Status: [PARTIAL] - Sprint creation wizard is in StudyPlanView; sprint task management works

---

## 11. Diagnostic Assessment (/app/diagnostic)

- **File:** frontend/src/routes/DiagnosticView.tsx (33,105 bytes)
- **Access:** Protected
- **Purpose:** 20-question MCQ assessment to gauge DSA mastery across 10+ categories

### Sections
1. **Intro Screen** - Description, instructions, "Begin Assessment" button
2. **Question Cards** - One question at a time; topic label; question text; optional code snippet; 4 answer choices (A/B/C/D)
3. **Navigation** - Prev/Next; progress bar
4. **Results Screen** - Score, confidence level (novice/intermediate/proficient/master) per category, category radar chart (CSS-based), recommended next steps

### Data Sources
- DIAGNOSTIC_QUESTIONS: hardcoded array of 20 Question objects in DiagnosticView.tsx (lines 35+)
- supabase.from('user_diagnostics'): stores per-tag mastery scores (attempts to upsert on completion)

### Status: [PARTIAL] - Questions are hardcoded; backend persistence exists but is inconsistently used

---

## 12. Leaderboard (/leaderboard)

- **File:** frontend/src/routes/LeaderboardView.tsx (22,704 bytes)
- **Access:** Public
- **Purpose:** Global and campus-league ranking

### Sections
1. **Tab Strip** - "Global Rankings" / "Campus League" / "Your College"
2. **Global Tab** - Search bar; table of engineers ranked by score (from Supabase profiles)
3. **Campus League Tab** - Table of colleges ranked by total_score; built from seeded SEEDED_COLLEGES data (not a real DB query)
4. **Your College Tab** - Shows users from same college as logged-in user

### Data Sources
- supabase.from('profiles'): all users ordered by score for global leaderboard
- SEEDED_COLLEGES (frontend/src/lib/colleges.ts): static seeded data for campus tab
- User's college_id from useAuth().profile

### Status: [PARTIAL] - Global works; campus league uses fake seeded data; no pagination

---

## 13. Roadmaps (/roadmaps and /roadmaps/:slug)

- **File:** frontend/src/routes/RoadmapsView.tsx (12,422 bytes)
- **Access:** Public
- **Purpose:** Browse and navigate structured learning roadmaps

### Sections
1. **Roadmap List** - Cards for each published roadmap (fetched from Supabase roadmaps table)
2. **Roadmap Detail** (when slug selected) - Steps list, expand/collapse topics under each step, problems under each topic

### Data Sources
- useRoadmap(slug): fetches from Supabase roadmaps table with steps and topics

### Status: [PARTIAL] - UI complete; data density in Supabase is unknown from code alone

---

## 14. Revision (/app/revision)

- **File:** frontend/src/routes/RevisionView.tsx (33,470 bytes)
- **Access:** Protected
- **Purpose:** Spaced repetition review queue for bookmarked problems

### Sections
1. **Review Queue** - Problems due for review sorted by next_review_at
2. **Card Flip UI** - Front: problem title and description; Back: hints/solution approach
3. **Interval Buttons** - "Too Easy" / "Got It" / "Struggled" to adjust next_review_at
4. **Progress Stats** - Reviewed today count; due remaining

### Data Sources
- supabase.from('user_revision_items'): items where next_review_at <= today
- supabase.from('problems'): problem details for each revision item

### Status: [PARTIAL] - Core flow works; no automated SRS algorithm (Anki-style); intervals manually set

---

## 15. CodeSpace (/app/codespace)

- **File:** frontend/src/routes/CodeSpaceView.tsx (26,046 bytes)
- **Access:** Protected
- **Purpose:** Personal cloud code vault; multi-file code snippets

### Sections
1. **Sidebar** - List of saved codespaces; search; filters; pin toggle
2. **Editor** - Monaco editor for selected codespace; language selector; save/delete buttons; stdin panel
3. **Header** - Title edit; tag management; pin button

### Data Sources
- supabase.from('user_codespaces'): CRUD operations

### Status: [DONE]

---

## 16. NoteSpace (/app/notespace)

- **File:** frontend/src/routes/NoteSpaceView.tsx (30,571 bytes)
- **Access:** Protected
- **Purpose:** Personal markdown notes linked to problems

### Sections
1. **Sidebar** - Note list; search; star filter; problem-linked filter
2. **Editor** - Split markdown editor + preview; star button; problem link
3. **Header** - Title edit

### Data Sources
- supabase.from('user_notes'): CRUD operations

### Status: [DONE]

---

## 17. Profile (/app/profile or /profile)

- **File:** frontend/src/routes/ProfileView.tsx (5,979 bytes)
- **Access:** Protected
- **Purpose:** Public-facing profile summary

### Sections
1. Avatar display (initials fallback if no avatar_url)
2. Full name, username, college
3. Stats: score, problems solved, streak
4. Social links (GitHub, LinkedIn)
5. Bio text

### Data Sources
- useAuth().profile

### Status: [DONE] - No avatar upload; social links not validated

---

## 18. Settings (/app/settings)

- **File:** frontend/src/routes/ProfileSettingsView.tsx (21,290 bytes)
- **Access:** Protected
- **Purpose:** Edit user profile and preferences

### Sections
1. **Personal Info** - Full name, username, bio
2. **Social Links** - GitHub username, LinkedIn URL, LeetCode username
3. **College Affiliation** - Searchable dropdown
4. **Editor Preferences** - Preferred language selector, tab size (2/4/8)
5. **Account Actions** - Sign Out button

### Interactions
- All fields save via updateProfile() -> supabase.from('profiles').update()
- Tab size and preferred language stored in profile.tab_size and profile.preferred_language

### Status: [DONE] - No avatar upload; no password change UI

---

## 19. Problem Authoring CMS (/authoring or /app/authoring)

- **File:** frontend/src/routes/ProblemAuthoringView.tsx (63,268 bytes)
- **Access:** Public at /authoring (SECURITY ISSUE), Protected at /app/authoring
- **Purpose:** Full problem lifecycle management CMS

### Sections
1. **Navigation Mode Toggle** - Dashboard / Queue / Studio
2. **Dashboard Tab** - ProductionDashboardTab component: pipeline metrics, batch list, progress charts
3. **Queue Tab** - AuthoringQueueTab component: paginated problem list with workflow status filters
4. **Studio** - Activated by selecting a problem from Queue
   - Content tab: Edit title, description, constraints, input/output format, examples, starter templates (per language), difficulty, domain, tags
   - Provenance tab: Add/edit source references, license info, attribution
   - Technical Review tab: 9-point checklist (statement_consistent, examples_correct, constraints_consistent, etc.), review notes, pass/fail
   - Revisions tab: Revision history list with diff view

### Data Sources
- supabase.from('problems'): catalog
- supabase.from('problem_content_revisions'): revision history
- supabase.from('problem_provenance_sources'): IP/license sources
- supabase.from('problem_technical_reviews'): review checklist records
- supabase.from('authoring_batches'): batch management
- supabase.from('batch_problem_items'): items per batch

### Status: [PARTIAL] - Full UI pipeline; AI-assisted authoring is UI-only; no real AI backend connected

---

## 20. Foundation Page (/foundation)

- **File:** frontend/src/routes/FoundationView.tsx (33,916 bytes)
- **Access:** Public
- **Purpose:** Static documentation about VERNIQ's pedagogical philosophy, learning methodology, curriculum design

### Status: [DONE] - Static content

---

## 21. Architecture Page (/architecture)

- **File:** frontend/src/routes/ArchitectureView.tsx (6,485 bytes)
- **Access:** Public
- **Purpose:** Static system architecture diagram and description

### Status: [DONE] - Static content

---

## 22. Courses Page (/courses)

- **File:** frontend/src/routes/CoursesView.tsx (5,479 bytes)
- **Access:** Public
- **Purpose:** Course catalog placeholder

### Status: [UI-ONLY] - Stub page; no actual course data

---

## 23. Placeholder Routes (WorkspaceSubView)

Routes that render WorkspaceSubView with "coming soon" messages:
- /app/learn - "Curriculum Sync In Progress" (Phase 2)
- /app/practice - "Code Judge Standby" (Phase 3)
- /app/contests - "No Live Contests" (Phase 4)
- /app/projects - "Capstone Projects Locked" (Phase 4)
- /app/ai-mentor - "AI Service Standby" (Phase 5)
- /app/admin - "Platform Telemetry Nominal" (Phase 1 - Admin)

**File:** frontend/src/routes/WorkspaceSubView.tsx (1,866 bytes)

### Status: [PLANNED] - All placeholders

---

## 24. 404 Not Found

- **File:** frontend/src/routes/NotFoundView.tsx (685 bytes)
- **Access:** Public (catch-all route)
- **Status:** [DONE] - Basic 404 message + back button

---

## 25. Dashboard Stub (/app/dashboard redirect flows)

DashboardStubView.tsx exists but is not used in App.tsx routing. It appears to be an old/unused file.

---

## Missing / Non-Existent Pages

- /reset-password: Supabase sends reset emails to this URL but the route does NOT exist in App.tsx. Password reset will show a 404.
- /pricing: No pricing page
- /checkout: No checkout page
- /admin/: No real admin panel; only placeholder
- /community: No community page
- /forum: No forum page
- /mock-interview: No mock interview page
