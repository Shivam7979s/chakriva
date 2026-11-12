# CHAKRIVA — PHASE J.7.7 TARGETED CANONICAL TEST SUITE REMEDIATION PLAN

## 1. Overview & Objective

This document defines the deterministic, safety-bounded remediation plan for **Phase J.7.7: Targeted Canonical Test Suite Remediation**.

Based on the read-only production audit conducted in Phase J.7.6 across 528 canonical test suites (76,990 tests in `cisddayhekkktcomnqhz.supabase.co`):
- **512 Grade-A suites (96.97%)** are certified production-ready and **STRICTLY IMMUTABLE** (zero changes permitted).
- **1 Grade-C suite (`VRQ-000238 Flood Fill` / `VRQ-000257 Surrounded Regions`)** is below the difficulty target count of 150.
- **15 Grade-B suites** require targeted deduplication and/or test category diversification.

**Objective:** Remediate ONLY the 16 identified problem suites to Grade-A quality standards while strictly preserving all valid existing canonical tests and maintaining zero test vector leakage.

---

## 2. Non-Negotiable Safety Rules Enforced

1. **Permanent IDs Preserved:** No problem `id` or `verniq_id` is altered.
2. **Problem Statements Untouched:** Problem descriptions, titles, hints, tags remain 100% untouched.
3. **512 Grade-A Suites Isolated:** Grade-A problem suites are untouched by all read/write operations.
4. **Valid Tests Preserved:** Valid existing canonical tests are strictly retained.
5. **No Whole-Suite Regeneration:** Suites are patched additively; only provable duplicate IDs are replaced.
6. **Zero Client Leakage:** Hidden test inputs/outputs are never queried by client-side bundles or logged publicly.
7. **100% Reference Solver Validation:** Every single generated test vector is executed and verified through an authoritative Python reference solution prior to database insertion.
8. **Deterministic Deduplication:** All new and replacement tests are cross-verified against retained unique tests using whitespace-normalized SHA-256 digests.

---

## 3. Targeted Problem Remediation Plan

The table below outlines the deterministic plan across all 16 target problem suites:

| Verniq ID | Title | Difficulty | Current Tests | Duplicates | Current Categories | Identified Weakness | Proposed Remediation | Tests to Add | Tests to Replace | Expected Final Count | Expected Final Categories |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `VRQ-000238` | Flood Fill | Easy/Med | 80 | 3 | sample: 80 | Below 150 target; 3 duplicates; 1 category | Replace 3 duplicates; add 70 canonical tests; diversify categories | 70 | 3 | 150 | sample, boundary, edge_case, adversarial, stress, hidden |
| `VRQ-000257` | Surrounded Regions | Medium | 80 | 0 | sample: 80 | Below 150 target; 1 category | Add 70 non-overlapping canonical tests; diversify categories | 70 | 0 | 150 | sample, boundary, edge_case, adversarial, stress, hidden |
| `VRQ-000244` | Design Search Autocomplete System | Hard | 200 | 198 | visible: 10, sample: 1, edge: 30, boundary: 30, adversarial: 30, stress: 30, hidden: 69 | 198 duplicates (99% input repetition) | Retain 2 unique sessions; replace 198 duplicates with unique verified sessions | 0 | 198 | 200 | sample, visible, edge, boundary, adversarial, stress, hidden |
| `VRQ-000028` | Decode String | Medium | 150 | 135 | sample: 3, edge: 37, hidden: 110 | 135 duplicates across 12 clusters | Retain 15 unique tests; replace 135 duplicates with unique nested/multi-group cases | 0 | 135 | 150 | sample, edge, boundary, edge_case, adversarial, stress, hidden |
| `VRQ-000034` | Valid Palindrome | Easy | 80 | 52 | sample: 3, edge: 22, hidden: 55 | 52 duplicates across 20 clusters | Retain 28 unique tests; replace 52 duplicates with distinct punctuation/case/numeric tests | 0 | 52 | 80 | sample, edge, boundary, edge_case, adversarial, stress, hidden |
| `VRQ-002999` | Iterator for Combination | Medium | 150 | 6 | edge: 22, boundary: 22, sample: 1, visible: 7, adversarial: 22, stress: 22, hidden: 54 | 6 duplicate command sequences | Retain 144 unique tests; replace 6 duplicates with unique combination iterator calls | 0 | 6 | 150 | sample, visible, edge, boundary, adversarial, stress, hidden |
| `VRQ-000246` | Amount of Time for Tree to Be Infected | Medium | 150 | 7 | sample: 150 | 7 duplicate trees; 1 category | Retain 143 unique tests; replace 7 duplicates with unique trees; diversify categories | 0 | 7 | 150 | sample, boundary, edge_case, adversarial, stress, hidden |
| `VRQ-000043` | Climbing Stairs | Easy | 80 | 35 | sample: 80 | 1 category; 35 duplicates due to $n \in [1,45]$ | Preserve all 80 tests (finite domain); diversify categories into boundary, edge, adversarial, stress | 0 | 0 | 80 | sample, boundary, edge_case, adversarial, stress, hidden |
| `VRQ-000236` | Best Time to Buy and Sell Stock IV | Hard | 200 | 1 | sample: 200 | 1 duplicate; 1 category | Replace 1 duplicate; diversify categories across boundary, edge, adversarial, stress | 0 | 1 | 200 | sample, boundary, edge_case, adversarial, stress, hidden |
| `VRQ-000256` | Rotate String | Easy | 80 | 0 | sample: 80 | 1 category (all sample) | Redistribute categories across sample, boundary, edge_case, adversarial, stress, hidden | 0 | 0 | 80 | sample, boundary, edge_case, adversarial, stress, hidden |
| `VRQ-000254` | Kth Smallest Element in a BST | Medium | 150 | 0 | sample: 150 | 1 category (all sample) | Redistribute categories across sample, boundary, edge_case, adversarial, stress, hidden | 0 | 0 | 150 | sample, boundary, edge_case, adversarial, stress, hidden |
| `VRQ-000041` | Merge Two Sorted Lists | Easy | 215 | 0 | hidden: 212, sample: 3 | Lacks explicit boundary/edge/stress categories | Redistribute categories across sample, boundary, edge_case, adversarial, stress, hidden | 0 | 0 | 215 | sample, boundary, edge_case, adversarial, stress, hidden |
| `VRQ-000230` | Fruit Into Baskets | Medium | 150 | 2 | sample: 150 | 2 duplicates; 1 category | Replace 2 duplicates; diversify categories across boundary, edge, adversarial, stress | 0 | 2 | 150 | sample, boundary, edge_case, adversarial, stress, hidden |
| `VRQ-000544` | Flatten Binary Tree to Linked List | Medium | 150 | 0 | sample: 150 | 1 category (all sample) | Redistribute categories across sample, boundary, edge_case, adversarial, stress, hidden | 0 | 0 | 150 | sample, boundary, edge_case, adversarial, stress, hidden |
| `VRQ-000231` | Partition Equal Subset Sum | Medium | 150 | 1 | sample: 150 | 1 duplicate; 1 category | Replace 1 duplicate; diversify categories across boundary, edge, adversarial, stress | 0 | 1 | 150 | sample, boundary, edge_case, adversarial, stress, hidden |
| `VRQ-000253` | Search Insert Position | Easy | 80 | 0 | sample: 80 | 1 category (all sample) | Redistribute categories across sample, boundary, edge_case, adversarial, stress, hidden | 0 | 0 | 80 | sample, boundary, edge_case, adversarial, stress, hidden |

---

## 4. Remediation Volumes & Expected Delta

- **Total Problem Suites Targeted:** 16
- **Total Initial Tests Across Target Suites:** 2,145 tests
- **Total Duplicate Tests Scheduled for Deletion:** 405 tests
- **Total New/Replacement Tests Generated & Validated:** 545 tests
  - 405 targeted 1:1 replacements for duplicate tests
  - 70 additive canonical tests for `VRQ-000238 Flood Fill` (bringing suite to 150)
  - 70 additive canonical tests for `VRQ-000257 Surrounded Regions` (bringing suite to 150)
- **Net Test Delta:** +140 canonical tests
- **Expected Production Canonical Test Total:** 76,990 + 140 = **77,130 tests**
- **Expected Global Quality Grades Post-Remediation:**
  - **Grade A:** 527 (or 528 with Climbing Stairs finite domain categorized)
  - **Grade B:** 0 (or 1 for Climbing Stairs)
  - **Grade C:** 0 (Flood Fill and Surrounded Regions both at 150 tests)
  - **Grade D:** 0

---

## 5. Execution Pipeline Sequence

```text
[1. READ] Load Manifest & Target Problem Records
   ↓
[2. PLAN] Verify 0 Collisions Against Kept Unique Test Hashes
   ↓
[3. REFERENCE VALIDATE] Run Reference Solvers on All 545 New Vectors (100% PASS)
   ↓
[4. PRE-WRITE DRY RUN] Assert Exactly 405 Deletions, 545 Additions, 0 Orphan Records
   ↓
[5. EXECUTE PRODUCTION WRITES]
   - Batch DELETE 405 Duplicate Test IDs
   - Batch INSERT 545 Verified Canonical Test Cases
   - Batch UPDATE Categories on Kept Records for Diversity
   ↓
[6. POST-WRITE AUDIT] Full 528-Suite Read-Only Regression Audit
```
