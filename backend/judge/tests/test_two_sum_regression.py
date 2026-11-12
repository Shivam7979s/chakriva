import unittest
import json
import os
import sys

judge_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_dir = os.path.dirname(os.path.dirname(judge_dir))
sys.path.insert(0, judge_dir)
sys.path.insert(0, root_dir)

from src.runner.comparator import compare_outputs, normalize_output
from scratch.generate_two_sum_suite import build_all_80_tests

class TestTwoSumComparatorAndCanonicalRegression(unittest.TestCase):
    def test_01_comparator_contract_preservation(self):
        """Verify generic comparator invariants are strictly preserved."""
        # Exact and normalized matches
        self.assertTrue(compare_outputs("42\n", "42"))
        self.assertTrue(compare_outputs("true", "TRUE"))
        self.assertTrue(compare_outputs("3.141592", "3.141593"))
        self.assertTrue(compare_outputs('"hello"', "hello"))

        # Array order sensitivity MUST be preserved for generic problems
        self.assertTrue(compare_outputs("[0, 1]", "[0, 1]"))
        self.assertTrue(compare_outputs("[0,1]", "[0, 1]"))
        self.assertFalse(compare_outputs("[0, 1]", "[1, 0]"))
        self.assertFalse(compare_outputs("[1, 2]", "[2, 1]"))
        self.assertFalse(compare_outputs("[]", "[0, 1]"))

    def test_02_canonical_two_sum_suite_mathematical_soundness(self):
        """Verify all 80 canonical test cases satisfy the problem specification."""
        suite = build_all_80_tests()
        self.assertEqual(len(suite), 80, "Suite must contain exactly 80 test cases")

        for tc in suite:
            nums = tc["nums"]
            target = tc["target"]
            order_idx = tc["order_index"]

            # Constraints check
            self.assertGreaterEqual(len(nums), 2, f"Test #{order_idx} must have >= 2 elements")
            self.assertLessEqual(len(nums), 10000, f"Test #{order_idx} must have <= 10000 elements")

            # Mathematical single unique pair assertion
            pairs = []
            for i in range(len(nums)):
                for j in range(i + 1, len(nums)):
                    if nums[i] + nums[j] == target:
                        pairs.append((i, j))

            self.assertEqual(
                len(pairs),
                1,
                f"Test #{order_idx} must have EXACTLY 1 solution pair, found {len(pairs)}"
            )

            expected_indices = list(pairs[0])
            expected_json = json.dumps(expected_indices)
            self.assertEqual(
                tc["expected_output"],
                expected_json,
                f"Test #{order_idx} expected_output must match genuine mathematical pair"
            )

    def test_03_reference_solution_passes_canonical_suite(self):
        """Verify correct Two Sum reference algorithm achieves 80/80."""
        suite = build_all_80_tests()

        def reference_two_sum(nums, target):
            seen = {}
            for i, val in enumerate(nums):
                complement = target - val
                if complement in seen:
                    return [seen[complement], i]
                seen[val] = i
            return []

        passed = 0
        for tc in suite:
            result = reference_two_sum(tc["nums"], tc["target"])
            if compare_outputs(json.dumps(result), tc["expected_output"]):
                passed += 1

        self.assertEqual(passed, 80, "Reference solution must pass 80/80")

    def test_04_wrong_solutions_produce_wrong_answer(self):
        """Verify invalid or biased solutions are rejected by comparator."""
        suite = build_all_80_tests()

        # Solution returning empty list (what happened originally on test #3 when no pair existed)
        empty_passed = sum(
            1 for tc in suite if compare_outputs("[]", tc["expected_output"])
        )
        self.assertEqual(empty_passed, 0, "Empty output must pass 0/80")

        # Solution returning hardcoded [0, 0]
        zero_zero_passed = sum(
            1 for tc in suite if compare_outputs("[0, 0]", tc["expected_output"])
        )
        self.assertEqual(zero_zero_passed, 0, "[0, 0] must pass 0/80")

        # Solution returning hardcoded [0, 1]
        dummy_passed = sum(
            1 for tc in suite if compare_outputs("[0, 1]", tc["expected_output"])
        )
        # Only passes genuine cases where answer is [0, 1]
        self.assertLess(dummy_passed, 15, "Hardcoded [0, 1] must not pass the majority of tests")

if __name__ == "__main__":
    unittest.main()
