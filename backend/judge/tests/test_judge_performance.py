"""Comprehensive Test Suite for VERNIQ Online Judge Architecture and Optimizations."""
import concurrent.futures
import json
import os
import shutil
import sys
import tempfile
import time
import unittest
import urllib.request
import urllib.error

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.runner.cache import CompilationCache
from src.runner.sandbox import SandboxRunner, TestCaseItem, job_registry

JUDGE_URL = os.getenv("JUDGE_URL", "http://127.0.0.1:8085")

class TestJudgeOptimizations(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.runner = SandboxRunner(time_limit_seconds=1.5, memory_limit_mb=128)

    def test_run_code_accepted_python(self):
        """Verify Python execution returns accepted verdict and correct output."""
        code = '''class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        lookup = {}
        for i, num in enumerate(nums):
            diff = target - num
            if diff in lookup: return [lookup[diff], i]
            lookup[num] = i
        return []'''
        tc = [TestCaseItem(input="nums = [2,7,11,15], target = 9", expected_output="[0,1]", is_sample=True)]
        res = self.runner.execute("python", code, tc, is_custom_run=True)
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 1)
        self.assertIsNotNone(res.telemetry)

    def test_run_code_accepted_java(self):
        """Verify Java execution returns accepted verdict and cached compilation on subsequent run."""
        code = '''class Solution {
    public int[] twoSum(int[] nums, int target) {
        return new int[]{0, 1};
    }
}'''
        tc = [TestCaseItem(input="nums = [2,7,11,15], target = 9", expected_output="[0,1]", is_sample=True)]
        # 1st run
        res1 = self.runner.execute("java", code, tc, is_custom_run=True)
        self.assertEqual(res1.verdict, "accepted")
        # 2nd run should hit compilation cache
        res2 = self.runner.execute("java", code, tc, is_custom_run=True)
        self.assertEqual(res2.verdict, "accepted")
        self.assertTrue(res2.telemetry.cached_compilation)
        self.assertEqual(res2.telemetry.compile_ms, 0)

    def test_wrong_answer(self):
        """Verify wrong answer is detected when output diverges from expected."""
        code = '''class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        return [99, 99]'''
        tc = [TestCaseItem(input="nums = [2,7,11,15], target = 9", expected_output="[0,1]", is_sample=False)]
        res = self.runner.execute("python", code, tc, is_custom_run=False)
        self.assertEqual(res.verdict, "wrong_answer")
        self.assertEqual(res.test_cases_passed, 0)

    def test_compilation_error(self):
        """Verify syntax error produces compilation_error verdict with compiler stderr."""
        invalid_code = '''public class Main {
    public static void main(String[] args) {
        SYNTAX_ERROR_NO_SEMICOLON
    }
}'''
        tc = [TestCaseItem(input="", expected_output=None)]
        res = self.runner.execute("java", invalid_code, tc, is_custom_run=True)
        self.assertEqual(res.verdict, "compilation_error")
        self.assertIsNotNone(res.compile_output)

    def test_runtime_error(self):
        """Verify uncaught runtime exception produces runtime_error verdict."""
        err_code = '''class Solution:
    def twoSum(self, nums, target):
        return 1 / 0'''
        tc = [TestCaseItem(input="nums = [2,7,11,15], target = 9", expected_output="[0,1]")]
        res = self.runner.execute("python", err_code, tc, is_custom_run=True)
        self.assertEqual(res.verdict, "runtime_error")

    def test_time_limit_exceeded(self):
        """Verify infinite loop triggers time_limit_exceeded and terminates."""
        tle_code = '''class Solution:
    def twoSum(self, nums, target):
        while True: pass'''
        tc = [TestCaseItem(input="nums = [2,7,11,15], target = 9", expected_output="[0,1]")]
        t0 = time.perf_counter()
        res = self.runner.execute("python", tle_code, tc, is_custom_run=True)
        dur = time.perf_counter() - t0
        self.assertEqual(res.verdict, "time_limit_exceeded")
        self.assertLess(dur, 6.0)

    def test_cache_correctness_and_invalidation(self):
        """Verify cache key changes when source code or flags change."""
        with tempfile.TemporaryDirectory() as td:
            cache = CompilationCache(cache_dir=td, max_entries=10)
            key1 = cache.compute_key("java", "class A {}", ["-g"])
            key2 = cache.compute_key("java", "class A {}", ["-O2"])
            key3 = cache.compute_key("java", "class B {}", ["-g"])

            self.assertNotEqual(key1, key2)
            self.assertNotEqual(key1, key3)

    def test_sandbox_cleanup(self):
        """Verify ephemeral sandbox directories are cleaned up after execution."""
        temp_dir = tempfile.gettempdir()
        before_entries = set(os.listdir(temp_dir))

        code = '''class Solution:
    def twoSum(self, nums, target): return [0, 1]'''
        tc = [TestCaseItem(input="nums = [2,7], target = 9", expected_output="[0,1]")]
        self.runner.execute("python", code, tc, is_custom_run=True)

        after_entries = set(os.listdir(temp_dir))
        verniq_leftovers = [f for f in (after_entries - before_entries) if f.startswith("verniq_sandbox_")]
        self.assertEqual(len(verniq_leftovers), 0, "Sandbox scratch directory was not cleaned up!")

    def test_cancellation_endpoint(self):
        """Verify cancellation endpoint terminates a running job."""
        exec_id = f"test-cancel-{int(time.time()*1000)}"
        payload = json.dumps({
            "language": "python",
            "source_code": "import time\nwhile True: time.sleep(0.05)",
            "execution_id": exec_id,
            "is_custom_run": True,
            "test_cases": [{"input": "", "expected_output": None}]
        }).encode("utf-8")

        def run_req():
            req = urllib.request.Request(f"{JUDGE_URL}/execute", data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req) as resp:
                return json.loads(resp.read().decode("utf-8"))

        pool = concurrent.futures.ThreadPoolExecutor(max_workers=2)
        future = pool.submit(run_req)

        time.sleep(0.3)
        cancel_req = urllib.request.Request(
            f"{JUDGE_URL}/cancel",
            data=json.dumps({"execution_id": exec_id}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(cancel_req) as resp:
            cancel_res = json.loads(resp.read().decode("utf-8"))
            self.assertTrue(cancel_res.get("cancelled"))

        res = future.result(timeout=4.0)
        self.assertEqual(res.get("verdict"), "cancelled")
        pool.shutdown(wait=False)

    def test_concurrent_executions_isolation(self):
        """Verify concurrent executions do not interfere with each other."""
        def run_one(i):
            code = f'''class Solution:
    def twoSum(self, nums, target):
        return [{i}, {i}]'''
            tc = [TestCaseItem(input="nums=[1], target=1", expected_output=None)]
            return self.runner.execute("python", code, tc, is_custom_run=True)

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            futures = [pool.submit(run_one, i) for i in range(5)]
            results = [f.result() for f in futures]

        for res in results:
            self.assertEqual(res.verdict, "accepted")

if __name__ == "__main__":
    unittest.main()
