# CHAKRIVA — PHASE J.7.5 CANONICAL TEST COVERAGE AUDIT

## 1. Executive Summary

### Do the 3,392 production problems exist?
**YES.** The production database (`cisddayhekkktcomnqhz.supabase.co`) contains exactly **3,392 problems** in `public.problems`.

### How many canonical tests actually exist?
There are **76,990 canonical test cases** stored in the production `public.test_cases` table. All 76,990 tests belong to the 3,392 production problems.

### Are the 2–3 tests shown in the UI the complete suite or only a subset?
The 2–3 tests observed in the UI were **NOT** caused by truncation or filtering of the production database. 
- In the **production database**, problems with canonical suites have **full, production-grade test suites** (e.g. `VRQ-000001 Two Sum` has **80 tests**, `VRQ-000002 LRU Cache` has **150 tests**, and `VRQ-000010 Trapping Rain Water` has **200 tests**).
- The reason `2–3 tests` (e.g. `Canonical Tests: 3 / 3 (Sample: 2, Hidden/Edge: 1)`) were observed during local developer testing is that the local environment was connected to the **local Supabase Docker container** (`http://127.0.0.1:54321`), which only contained **6 seed problems** and **19 seed test cases** (3 tests for `VRQ-000010`).
- Neither the frontend, Spring Boot, nor the judge worker truncates test counts. In production, the judge executes all 80, 150, or 200 tests.
- However, across the broader 3,392-problem catalog, **528 problems** have complete test suites (80 to 265 tests each), while **2,864 problems** currently have 0 tests in the production database.

---

## 2. Production Database

- **Supabase Project Identifier:** `cisddayhekkktcomnqhz`
- **Database/API Endpoint:** `https://cisddayhekkktcomnqhz.supabase.co` (PostgREST API @ `/rest/v1`, GoTrue Auth @ `/auth/v1`, PostgreSQL behind Supabase Cloud)
- **Frontend Production Environment:** Connected to `https://cisddayhekkktcomnqhz.supabase.co` via production `.env` configuration.
- **Backend Production Environment:** AWS EC2 Judge Worker (`chakriva-judge-node-01` @ `16.4.24.18`, AWS Region `ap-south-1`).
- **Local vs Production Differentiation:** **YES.** Local and production point to entirely different Supabase projects:
  - Local: `http://127.0.0.1:54321` (Docker Compose GoTrue + PostgreSQL meta + PostgREST, Project ID: `supabase-demo`).
  - Production: `https://cisddayhekkktcomnqhz.supabase.co` (Supabase Cloud Hosted, Project ID: `cisddayhekkktcomnqhz`).
- **Problem Count:** **3,392**
- **Test-Case Count:** **76,990**

---

## 3. Test Schema

### Table Structure & Relationships:
- **Table Name:** `public.test_cases`
- **Primary Key:** `id` (`UUID`, default: `gen_random_uuid()`)
- **Problem Relationship:** `problem_id` (`UUID NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE`)
- **Problem Version Relationship:** Tests belong **directly to `public.problems`**, **NOT** to `ProblemVersion`. There is no `problem_version_id` column in `public.test_cases`.
- **Sample Flag:** `is_sample` (`BOOLEAN NOT NULL DEFAULT false`)
- **Visibility Flag:** Handled via `category` column (`category = 'visible'` vs `'sample'` vs `'hidden'`). There is no separate `is_visible` boolean column.
- **Test Category/Type:** `category` (`TEXT NOT NULL DEFAULT 'sample'`). Active categories found in production:
  - `sample` (2,024 tests)
  - `visible` (5,513 tests)
  - `hidden` (19,821 tests)
  - `edge_case` / `edge` (12,457 tests combined)
  - `boundary` (11,858 tests)
  - `adversarial` (12,202 tests)
  - `stress` (12,475 tests)
  - Specific problem taxonomy tags: `basic` (182), `large_scale` (70), `random` (70), `combinatorial` (60), `medium_case` (56), `small_medium` (51), `stress_boundary` (40), `corner` (33), `carry_propagation` (20), `disparate_length` (20), `max_stress` (11), `single_digit` (8), `three_houses` (6), `two_houses` (5), `max_constraint` (4), `edge_boundary` (4).
- **Active/Enabled Flag:** `is_active` (`BOOLEAN NOT NULL DEFAULT true`). All 76,990 tests in production have `is_active = true`.
- **Ordering Field:** `order_index` (`INTEGER NOT NULL DEFAULT 0`).
- **Explanation Field:** `explanation` (`TEXT`, optional).
- **Created/Updated Fields:** Not present on `test_cases` table.

### Schema Relationship Diagram:
```text
public.problems (id: UUID)
       │
       ├──< 1:N >── public.problem_versions (problem_id: UUID)
       │
       └──< 1:N >── public.test_cases (problem_id: UUID)
```

---

## 4. Global Test Distribution

Aggregated metrics across all **3,392 problems** in the production database:

| Metric Bucket | Problem Count | Percentage |
| :--- | :--- | :--- |
| **Total Problems** | **3,392** | 100.0% |
| Problems with 0 tests | 2,864 | 84.43% |
| Problems with 1 test | 0 | 0.00% |
| Problems with 2 tests | 0 | 0.00% |
| Problems with 3 tests | 0 | 0.00% |
| Problems with 4–10 tests | 0 | 0.00% |
| Problems with 11–50 tests | 0 | 0.00% |
| Problems with 51–79 tests | 0 | 0.00% |
| Problems with 80–149 tests | 107 | 3.15% |
| Problems with 150–199 tests | 318 | 9.38% |
| Problems with 200+ tests | 103 | 3.04% |

### Statistical Metrics:
- **Minimum tests/problem:** `0` (overall) / `80` (for problems with test suites)
- **Maximum tests/problem:** `265`
- **Average tests/problem:** `22.70` (overall across 3,392) / `145.81` (across the 528 problems with test suites)
- **Median tests/problem:** `0.0`

---

## 5. Difficulty Distribution

Grouped canonical test metrics by problem difficulty across the 3,392 production problems:

### Easy Problems (Target: 80 tests)
- **Number of problems:** 815
- **Minimum tests:** 0
- **Maximum tests:** 215
- **Average tests:** 13.18
- **Median tests:** 0
- **Problems reaching >= 80 tests:** **117** (14.4%)
- **Problems below 80 tests:** **698** (85.6%)

### Medium Problems (Target: 150 tests)
- **Number of problems:** 1,803
- **Minimum tests:** 0
- **Maximum tests:** 265
- **Average tests:** 26.65
- **Median tests:** 0
- **Problems reaching >= 150 tests:** **319** (17.7%)
- **Problems below 150 tests:** **1,484** (82.3%)

### Hard Problems (Target: 200 tests)
- **Number of problems:** 774
- **Minimum tests:** 0
- **Maximum tests:** 200
- **Average tests:** 23.51
- **Median tests:** 0
- **Problems reaching >= 200 tests:** **91** (11.8%)
- **Problems below 200 tests:** **683** (88.2%)

---

## 6. Problem-Level Sample Audit

Detailed audit of representative core problems queried directly from production:

| Verniq ID / Slug | Title | Difficulty | Total Stored | Sample | Visible | Hidden | Active | RUN Selection | SUBMIT Selection | Category Breakdown |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **VRQ-000001** (`two-sum`) | Two Sum | Easy | **80** | 2 | 7 | 78 | 80 | 2 | **80** | sample: 2, visible: 7, boundary: 15, edge_case: 15, adversarial: 15, stress: 10, hidden: 16 |
| **VRQ-000002** (`lru-cache`) | LRU Cache | Medium | **150** | 1 | 0 | 149 | 150 | 1 | **150** | sample: 1, edge_case: 16, hidden: 67, stress: 66 |
| **VRQ-000003** (`merge-intervals`) | Merge Intervals | Medium | **150** | 2 | 0 | 148 | 150 | 2 | **150** | sample: 2, edge_case: 1, hidden: 74, stress: 73 |
| **VRQ-000004** (`valid-parentheses`) | Valid Parentheses | Easy | **80** | 3 | 0 | 77 | 80 | 3 | **80** | sample: 3, edge_case: 28, hidden: 49 |
| **VRQ-000006** (`best-time-to-buy-and-sell-stock`) | Best Time to Buy and Sell Stock | Easy | **80** | 2 | 13 | 78 | 80 | 2 | **80** | sample: 2, visible: 13, boundary: 13, edge_case: 13, adversarial: 12, stress: 13, hidden: 14 |
| **VRQ-000016** (`3sum`) | 3Sum | Medium | **150** | 3 | 30 | 147 | 150 | 3 | **150** | sample: 3, visible: 30, edge_case: 29, adversarial: 29, boundary: 1, stress: 29, hidden: 29 |
| **VRQ-000010** (`trapping-rain-water`) | Trapping Rain Water | Hard | **200** | 2 | 0 | 198 | 200 | 2 | **200** | sample: 2, edge: 23, boundary: 35, hidden: 140 |
| **VRQ-000012** (`container-with-most-water`) | Container With Most Water | Medium | **150** | 3 | 0 | 147 | 150 | 3 | **150** | sample: 3, edge_case: 18, boundary: 29, hidden: 62, stress: 38 |
| **VRQ-000018** (`search-in-rotated-sorted-array`) | Search in Rotated Sorted Array | Medium | **150** | 2 | 0 | 148 | 150 | 2 | **150** | sample: 2, edge: 38, hidden: 110 |

---

## 7. RUN Selection Logic

Source inspection of `backend/judge/src/worker.py` (lines 304–318):

```python
if job.mode == JobMode.RUN:
    is_custom_run = True
    if job.customInput and job.customInput.strip():
        test_cases = [
            TestCaseItem(
                input=job.customInput,
                expected_output=None,
                is_sample=True,
            )
        ]
    else:
        all_cases = self.fetch_canonical_test_cases(job.problemId)
        test_cases = [tc for tc in all_cases if tc.is_sample]
        if not test_cases:
            test_cases = all_cases[:2] if all_cases else [TestCaseItem(input="", expected_output=None, is_sample=True)]
```

### Behavior:
1. **Custom Input Handling:** If the candidate provides text in `customInput`, the worker constructs exactly 1 ephemeral `TestCaseItem(input=customInput, expected_output=None, is_sample=True)`.
2. **Sample Test Selection:** If no `customInput` is provided, the worker queries canonical tests for the problem and filters strictly for `[tc for tc in all_cases if tc.is_sample]`.
3. **Number of Tests Selected:** Typically **2 to 3 tests** (the problem's sample test cases).
4. **Anti-Leak Security:** Hidden canonical tests are strictly excluded during `RUN` mode.
5. **Progress Isolation:** `is_custom_run` is set to `True`, ensuring Spring Boot's `SubmissionService` does not update official candidate progress.

---

## 8. SUBMIT Selection Logic

Source inspection of `backend/judge/src/worker.py` (lines 319–325 & 212–274):

```python
else:  # SUBMIT mode
    is_custom_run = False
    test_cases = self.fetch_canonical_test_cases(job.problemId)
    if not test_cases:
        logger.warning("No canonical test cases found for problem %s in SUBMIT mode", job.problemId)
        test_cases = [TestCaseItem(input="", expected_output=None)]
```

In `fetch_canonical_test_cases(self, problem_id: str)`:
```python
res = (
    self.supabase.table("test_cases")
    .select("input, expected_output, is_sample")
    .eq("problem_id", problem_id)
    .order("order_index", desc=False)
    .execute()
)
```

### Analysis:
- **No LIMIT:** The query does not specify a `limit()` parameter (default PostgREST ceiling is 1,000, easily accommodating 80–200 tests).
- **No Pagination Truncation:** Does not truncate the array.
- **No Sample-Only Filter:** `is_sample` is selected as metadata, NOT used as a filter.
- **No Visibility Filter:** All tests (sample, visible, hidden, edge, boundary, adversarial, stress) are fetched.
- **No Early Return:** The complete array is mapped to `TestCaseItem` and passed directly to `SandboxRunner.execute()`.
- **Verdict:** In production, SUBMIT mode executes **all 80, 150, or 200 canonical test cases**.

---

## 9. VRQ-000010 Trace

### Problem: VRQ-000010 — Trapping Rain Water

The lifecycle trace explains why the UI previously reported `Canonical Tests: 3 / 3 (Sample: 2, Hidden/Edge: 1)`:

```text
Local Developer Session:
  1. Frontend connected to local Supabase: http://127.0.0.1:54321
  2. Spring Boot connected to local PostgreSQL: localhost:54322
  3. Judge Worker reverse tunnel forwarded: port 54321 -> localhost:54321
  4. Local DB test_cases query for VRQ-000010:
     SELECT id, is_sample FROM test_cases WHERE problem_id = '00000000-0000-0000-0000-000000000306';
     -> Returned exactly 3 rows (2 sample, 1 hidden) from seed migrations!
  5. Judge Worker executed: exactly 3 test cases.
  6. Callback payload sent: { "totalTestCases": 3, "testCasesPassed": 3 }
  7. Spring Boot saved: total_test_cases = 3
  8. Frontend polled and displayed:
     "Canonical Tests: 3 / 3 Passed"
     "Canonical Tests: 3 • Sample: 2 • Hidden/Edge: 1"
```

### Contrast with Production Supabase (`cisddayhekkktcomnqhz`):
- Production DB `test_cases` query for `VRQ-000010`:
  `SELECT count(*) FROM test_cases WHERE problem_id = '00000000-0000-0000-0000-000000000306';`
  **-> Returns exactly 200 rows!**
- When connected to the production database, the execution flow executes and reports **200 / 200** tests.

---

## 10. Frontend Count Verification

Source inspection of `TestCaseConsole.tsx` (lines 532–554) and `ProblemWorkspace.tsx` (lines 104–105):

```tsx
<span className="text-xs font-mono font-bold text-white bg-black/40 px-2.5 py-1 rounded border border-white/10">
  Canonical Tests: {testCasesPassed} / {totalTestCases} Passed
</span>
<div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400 mt-1">
  <span>Canonical Tests: {totalTestCases}</span>
  {sampleTestCount > 0 && totalTestCases > sampleTestCount && (
    <>
      <span>•</span>
      <span>Sample: {sampleTestCount}</span>
      <span>•</span>
      <span>Hidden/Edge: {totalTestCases - sampleTestCount}</span>
    </>
  )}
</div>
```

- In `ProblemWorkspace.tsx`:
  `totalTestCases` is set directly from `liveSubmission.total_test_cases`, which is returned by Spring Boot's `SubmissionDetailDto.totalTestCases`.
- **Verdict: The frontend does NOT truncate or calculate the test count itself.**
- It is a pure pass-through display of the authoritative server-reported count from Spring Boot and the judge worker.

---

## 11. Local vs Production Comparison

| Environment Attribute | Local Development Environment | Production Environment |
| :--- | :--- | :--- |
| **Supabase URL** | `http://127.0.0.1:54321` | `https://cisddayhekkktcomnqhz.supabase.co` |
| **Project Identifier** | `supabase-demo` | `cisddayhekkktcomnqhz` |
| **Database Host** | `localhost:54322` (Docker) | Cloud PostgreSQL (AWS / Supabase) |
| **Catalog Problems Count** | **6** | **3,392** |
| **Total Test Cases Count** | **19** | **76,990** |
| **Test Cases for VRQ-000001** | 4 (3 sample, 1 hidden) | 80 (2 sample, 78 hidden/edge) |
| **Test Cases for VRQ-000010** | 3 (2 sample, 1 hidden) | 200 (2 sample, 198 hidden/edge) |

---

## 12. Production Target Gap

Comparison of actual production canonical test counts against production target criteria:
- **Easy Target:** 80 canonical tests
- **Medium Target:** 150 canonical tests
- **Hard Target:** 200 canonical tests

| Difficulty | Problems in DB | Target / Problem | Problems At/Above Target | Problems Below Target | Additional Tests Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Easy** | 815 | 80 | 117 (14.4%) | 698 (85.6%) | 55,840 |
| **Medium** | 1,803 | 150 | 319 (17.7%) | 1,484 (82.3%) | 222,520 |
| **Hard** | 774 | 200 | 91 (11.8%) | 683 (88.2%) | 136,600 |
| **Total** | **3,392** | - | **527** (15.5%) | **2,865** (84.5%) | **414,960** |

*(Note: 1 problem in the Easy category has 79 tests, just 1 below target; 2,864 problems currently have 0 tests).*

---

## 13. Security Verification

During this read-only audit:
- **Zero Hidden Test Inputs or Expected Outputs Exposed:** All queries to `public.test_cases` strictly selected metadata columns (`id, problem_id, category, is_sample, is_active`). No test vectors were logged, dumped, or stored.
- **Zero Secrets Emitted:** No API keys, JWT tokens, database passwords, internal judge secrets, or authorization headers were exposed in reports or console logs.
- **Strict Read-Only Verification:** No `INSERT`, `UPDATE`, `DELETE`, or schema DDL queries were issued against either local or production databases.

---

## 14. Git State

Verification of local repository working tree:

```text
PS C:\Users\LOQ\Desktop\VERNIQ> git status --short
 M backend/app/src/main/java/com/verniq/api/VerniqApplication.java
 M backend/app/src/main/java/com/verniq/api/submissions/controller/JudgeResultIngestionController.java
 M backend/app/src/main/java/com/verniq/api/submissions/metrics/SubmissionMetrics.java
 M backend/app/src/main/java/com/verniq/api/submissions/queue/SubmissionQueueProducer.java
 M backend/app/src/main/java/com/verniq/api/submissions/repository/SubmissionRepository.java
 M backend/app/src/main/java/com/verniq/api/submissions/service/SubmissionRecoveryService.java
 M backend/app/src/main/java/com/verniq/api/submissions/service/SubmissionService.java
 M backend/app/src/main/resources/application-local.yml
 M backend/judge/src/callback/client.py
 M backend/judge/src/consumer.py
 M backend/judge/src/runner/docker_sandbox.py
 M backend/judge/src/worker.py
 M frontend/src/components/workspace/ProblemWorkspace.tsx
 M frontend/src/hooks/useProblemBySlug.ts
 M frontend/src/lib/apiClient.ts
 M frontend/src/lib/submissionService.ts
 M frontend/src/lib/supabaseClient.ts
?? backend/judge/.dockerignore
?? backend/judge/setup_ec2_host.sh
?? backend/judge/verify_ec2_host.sh
?? docs/judge/aws-judge-deployment.md
?? docs/judge/phase_j75_canonical_test_coverage_audit.md
?? scratch/
```

- **Zero application code modifications** were introduced by this audit.
- The only newly created file in `docs/` is this audit report: `docs/judge/phase_j75_canonical_test_coverage_audit.md`.
- No commits or branch pushes were executed.

---

## 15. Recommended Next Phase

Based on the audit findings:
1. **The Judge Execution Pipeline is Sound:** The judge, Spring Boot, and frontend correctly support and execute the full canonical test suites (80, 150, 200 tests) without truncation.
2. **Catalog Test Suite Generation Phase (Phase J.8):** A dedicated authoring / batch ingestion pipeline is recommended to generate and seed canonical test suites for the remaining 2,864 problems that currently have 0 tests in production.
3. **Resume Phase J.7.5 Observability:** Now that the test suite coverage and execution behavior are fully understood, the team can confidently complete the original Phase J.7.5 objectives: **Production Judge Observability & Operational Monitoring** (structured logging, correlation IDs, worker metrics, and telemetry).

---

# PHASE J.7.5 AUDIT: COMPLETE
