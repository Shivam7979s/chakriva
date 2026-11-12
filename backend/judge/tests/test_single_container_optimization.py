"""Local Verification & Benchmark Suite for Single-Container Optimization.

Validates:
1. Strict process and filesystem state isolation between tests.
2. All verdict outcomes: AC, WA (fast-fail), CE, RE, and judge-generated actual TLE.
3. Durable lease heartbeat under long-running execution.
4. Wall-clock benchmarks: Easy (80 tests), Medium (150 tests), Hard (200 tests).
"""
import os
import sys
import time
import unittest
from pathlib import Path

# Add backend/judge to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.runner.docker_sandbox import DockerSandbox
from src.runner.sandbox import ExecutionResult, SandboxRunner, TestCaseItem
from src.worker import LeaseHeartbeat


class TestSingleContainerOptimization(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sandbox = DockerSandbox()
        cls.docker_ready = cls.sandbox.is_available() and cls.sandbox.is_image_present()
        cls.runner = SandboxRunner(
            time_limit_seconds=2.0,
            memory_limit_mb=256,
            docker_sandbox=cls.sandbox,
        )

    def setUp(self):
        if not self.docker_ready:
            self.skipTest("Docker daemon or candidate image unavailable.")

    # ----------------------------------------------------------------------
    # 1. State Isolation: Static / Global State
    # ----------------------------------------------------------------------
    def test_01_state_isolation_java_static(self):
        """Verifies that static class variables are completely reset between test cases."""
        code = """import java.util.Scanner;
public class Solution {
    private static int counter = 0;
    public static void main(String[] args) {
        counter++;
        System.out.println("counter=" + counter);
    }
}
"""
        # If static state leaked across tests, counter would be 1, 2, 3, 4, 5.
        # With per-test process address space isolation, every test case receives counter=1.
        test_cases = [
            TestCaseItem(input="", expected_output="counter=1")
            for _ in range(5)
        ]
        res = self.runner.execute(
            language="java",
            source_code=code,
            test_cases=test_cases,
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 5)

    # ----------------------------------------------------------------------
    # 2. State Isolation: Filesystem Leakage
    # ----------------------------------------------------------------------
    def test_02_state_isolation_filesystem(self):
        """Verifies that filesystem artifacts written by one test do not leak to another."""
        code = """import java.io.*;
import java.util.Scanner;
public class Solution {
    public static void main(String[] args) throws Exception {
        Scanner sc = new Scanner(System.in);
        String op = sc.hasNext() ? sc.next() : "";
        File f = new File("scratch_leak.tmp");
        if ("write".equals(op)) {
            f.createNewFile();
            System.out.println("WROTE");
        } else {
            if (f.exists()) {
                System.out.println("LEAKED");
            } else {
                System.out.println("ISOLATED");
            }
        }
    }
}
"""
        test_cases = [
            TestCaseItem(input="write", expected_output="WROTE"),
            TestCaseItem(input="check", expected_output="ISOLATED"),
            TestCaseItem(input="write", expected_output="WROTE"),
            TestCaseItem(input="check", expected_output="ISOLATED"),
        ]
        res = self.runner.execute(
            language="java",
            source_code=code,
            test_cases=test_cases,
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 4)

    # ----------------------------------------------------------------------
    # 3. Verdict: Accepted (AC)
    # ----------------------------------------------------------------------
    def test_03_verdict_accepted(self):
        """Verifies canonical ACCEPTED verdict."""
        code = """import java.util.Scanner;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            System.out.println(a + b);
        }
    }
}
"""
        test_cases = [
            TestCaseItem(input="1 2", expected_output="3"),
            TestCaseItem(input="10 20", expected_output="30"),
            TestCaseItem(input="-5 5", expected_output="0"),
        ]
        res = self.runner.execute(
            language="java",
            source_code=code,
            test_cases=test_cases,
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 3)

    # ----------------------------------------------------------------------
    # 4. Verdict: Wrong Answer (WA) with Fast-Fail
    # ----------------------------------------------------------------------
    def test_04_verdict_wrong_answer_fast_fail(self):
        """Verifies WRONG_ANSWER halts immediately in SUBMIT mode."""
        code = """import java.util.Scanner;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        if (n == 3) {
            System.out.println("WRONG");
        } else {
            System.out.println(n);
        }
    }
}
"""
        test_cases = [
            TestCaseItem(input="1", expected_output="1"),
            TestCaseItem(input="2", expected_output="2"),
            TestCaseItem(input="3", expected_output="3"),  # Fails here
            TestCaseItem(input="4", expected_output="4"),
            TestCaseItem(input="5", expected_output="5"),
        ]
        res = self.runner.execute(
            language="java",
            source_code=code,
            test_cases=test_cases,
            is_custom_run=False,
        )
        self.assertEqual(res.verdict, "wrong_answer")
        self.assertEqual(res.test_cases_passed, 2)
        self.assertIsNotNone(res.first_failed_test)
        self.assertEqual(res.first_failed_test.test_number, 3)

    # ----------------------------------------------------------------------
    # 5. Verdict: Compilation Error (CE)
    # ----------------------------------------------------------------------
    def test_05_verdict_compilation_error(self):
        """Verifies COMPILATION_ERROR when source fails javac."""
        code = "public class Solution { syntax error }"
        res = self.runner.execute(
            language="java",
            source_code=code,
            test_cases=[TestCaseItem(input="", expected_output="")],
        )
        self.assertEqual(res.verdict, "compilation_error")
        self.assertIn("error", res.compile_output.lower())

    # ----------------------------------------------------------------------
    # 6. Verdict: Runtime Error (RE)
    # ----------------------------------------------------------------------
    def test_06_verdict_runtime_error(self):
        """Verifies RUNTIME_ERROR when candidate throws unhandled exception."""
        code = """public class Solution {
    public static void main(String[] args) {
        int x = 1 / 0;
    }
}
"""
        res = self.runner.execute(
            language="java",
            source_code=code,
            test_cases=[TestCaseItem(input="", expected_output="")],
        )
        self.assertEqual(res.verdict, "runtime_error")
        self.assertIsNotNone(res.stderr_output)

    # ----------------------------------------------------------------------
    # 7. Verdict: Time Limit Exceeded (TLE) - Actual Judge Enforced
    # ----------------------------------------------------------------------
    def test_07_verdict_actual_time_limit_exceeded(self):
        """Verifies actual judge-enforced TIME_LIMIT_EXCEEDED on infinite loop."""
        code = """public class Solution {
    public static void main(String[] args) {
        while (true) {}
    }
}
"""
        runner = SandboxRunner(
            time_limit_seconds=1.0,
            memory_limit_mb=256,
            docker_sandbox=self.sandbox,
        )
        t0 = time.perf_counter()
        res = runner.execute(
            language="java",
            source_code=code,
            test_cases=[TestCaseItem(input="", expected_output="")],
        )
        wall_sec = time.perf_counter() - t0
        self.assertEqual(res.verdict, "time_limit_exceeded")
        self.assertGreaterEqual(res.runtime_ms, 1000)
        self.assertLess(wall_sec, 6.0)

    # ----------------------------------------------------------------------
    # 8. Lease Heartbeat Test
    # ----------------------------------------------------------------------
    def test_08_lease_heartbeat_renewal(self):
        """Verifies LeaseHeartbeat periodically calls renew_lease."""
        renew_calls = []

        class MockConsumer:
            def renew_lease(self, job_id, extension_seconds=60):
                renew_calls.append((job_id, extension_seconds, time.time()))
                return True

        consumer = MockConsumer()
        hb = LeaseHeartbeat(consumer, "test-job-uuid", interval_seconds=0.1, extension_seconds=60)
        hb.start()
        time.sleep(0.35)
        hb.stop()

        self.assertGreaterEqual(len(renew_calls), 2)
        self.assertEqual(renew_calls[0][0], "test-job-uuid")
        self.assertEqual(renew_calls[0][1], 60)

    # ----------------------------------------------------------------------
    # 9. Benchmark: Easy (80 canonical test cases)
    # ----------------------------------------------------------------------
    def test_09_benchmark_easy_80(self):
        """Benchmark: 80 canonical test cases in single Docker sandbox."""
        code = """import java.util.Scanner;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int x = sc.nextInt();
        System.out.println(x * 2);
    }
}
"""
        test_cases = [
            TestCaseItem(input=str(i), expected_output=str(i * 2))
            for i in range(80)
        ]
        t0 = time.perf_counter()
        res = self.runner.execute(
            language="java",
            source_code=code,
            test_cases=test_cases,
        )
        wall_ms = int((time.perf_counter() - t0) * 1000)
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 80)
        print(f"\n[BENCHMARK] Easy (80 tests): {wall_ms} ms total wall-clock")

    # ----------------------------------------------------------------------
    # 10. Benchmark: Medium (150 canonical test cases - Merge Intervals)
    # ----------------------------------------------------------------------
    def test_10_benchmark_medium_150(self):
        """Benchmark: 150 canonical test cases in single Docker sandbox."""
        code = """import java.util.Scanner;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println("[" + a + "," + b + "]");
    }
}
"""
        test_cases = [
            TestCaseItem(input=f"{i} {i+5}", expected_output=f"[{i},{i+5}]")
            for i in range(150)
        ]
        t0 = time.perf_counter()
        res = self.runner.execute(
            language="java",
            source_code=code,
            test_cases=test_cases,
        )
        wall_ms = int((time.perf_counter() - t0) * 1000)
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 150)
        print(f"\n[BENCHMARK] Medium (150 tests): {wall_ms} ms total wall-clock")

    # ----------------------------------------------------------------------
    # 11. Benchmark: Hard (200 canonical test cases)
    # ----------------------------------------------------------------------
    def test_11_benchmark_hard_200(self):
        """Benchmark: 200 canonical test cases in single Docker sandbox."""
        code = """import java.util.Scanner;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int x = sc.nextInt();
        System.out.println(x * x);
    }
}
"""
        test_cases = [
            TestCaseItem(input=str(i), expected_output=str(i * i))
            for i in range(200)
        ]
        t0 = time.perf_counter()
        res = self.runner.execute(
            language="java",
            source_code=code,
            test_cases=test_cases,
        )
        wall_ms = int((time.perf_counter() - t0) * 1000)
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 200)
        print(f"\n[BENCHMARK] Hard (200 tests): {wall_ms} ms total wall-clock")


if __name__ == "__main__":
    unittest.main()
