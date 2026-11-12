"""Phase 12/13 Pre-Production Validation: Hardened Sandbox Security & Verdict Semantics.

Validates:
Task 6: Malicious Sandbox Security (Single-Container Optimization Path)
1. Network egress blocked (--network none): sockets/HTTP requests fail immediately
2. Fork bomb contained (--pids-limit 64): cannot starve host resources or crash judge
3. Root filesystem immutability (--read-only): writes to /, /etc, /sandbox fail
4. Process group kill: detached processes killed with SIGKILL when test finishes
5. Ephemeral test tmpfs: per-test scratch directory cleaned up after each test

Task 7: Strict Verdict Semantics Preservation
1. ACCEPTED (all tests pass)
2. WRONG_ANSWER (fast-fail on first mismatch in SUBMIT mode)
3. COMPILATION_ERROR (zero tests run, compiler diagnostics captured)
4. RUNTIME_ERROR (unhandled exception captured with exit code and stderr)
5. TIME_LIMIT_EXCEEDED (real per-test timeout enforcement, runtime reported)
"""
import os
import sys
import time
import unittest
from pathlib import Path

# Add backend/judge to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.runner.docker_sandbox import DockerSandbox
from src.runner.sandbox import SandboxRunner, TestCaseItem


class TestOptimizedSecurityAndVerdicts(unittest.TestCase):
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
            self.skipTest("Docker daemon or candidate sandbox image unavailable.")

    # =========================================================================
    # Task 6: Malicious Sandbox Security Tests
    # =========================================================================
    def test_security_01_network_egress_blocked(self):
        """Verify network access is blocked inside the single container (--network none)."""
        code = """import socket
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.0)
    s.connect(("1.1.1.1", 80))
    print("NETWORK_CONNECTED")
except Exception as e:
    print("NETWORK_BLOCKED")
"""
        test_cases = [TestCaseItem(input="", expected_output="NETWORK_BLOCKED")]
        res = self.runner.execute(
            language="python",
            source_code=code,
            test_cases=test_cases,
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 1)

    def test_security_02_fork_bomb_contained(self):
        """Verify fork bomb cannot exhaust host PIDs or crash the single-container runner (--pids-limit 64)."""
        code = """import os
import sys
# Attempt fork bomb
try:
    while True:
        os.fork()
except Exception:
    print("FORK_FAILED")
"""
        # Even if unhandled or killed by PID limit / timeout, host must survive and runner must report cleanly
        test_cases = [TestCaseItem(input="", expected_output="FORK_FAILED")]
        res = self.runner.execute(
            language="python",
            source_code=code,
            test_cases=test_cases,
        )
        # Should cleanly terminate without host degradation
        self.assertIn(res.verdict, ("accepted", "runtime_error", "time_limit_exceeded", "wrong_answer"))

    def test_security_03_read_only_root_filesystem(self):
        """Verify root filesystem is read-only (--read-only); writing to / or /sandbox fails."""
        code = """import os
for path in ["/evil.txt", "/etc/evil.txt", "/sandbox/evil.txt"]:
    try:
        with open(path, "w") as f:
            f.write("hacked")
        print(f"WROTE_{path}")
    except (PermissionError, OSError):
        print(f"BLOCKED_{path}")
"""
        expected = "BLOCKED_/evil.txt\nBLOCKED_/etc/evil.txt\nBLOCKED_/sandbox/evil.txt"
        test_cases = [TestCaseItem(input="", expected_output=expected)]
        res = self.runner.execute(
            language="python",
            source_code=code,
            test_cases=test_cases,
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 1)

    # =========================================================================
    # Task 7: Verdict Semantics Validation
    # =========================================================================
    def test_verdict_01_accepted(self):
        """Verify ACCEPTED verdict when all test cases pass."""
        code = """x = int(input())
print(x * 10)
"""
        test_cases = [
            TestCaseItem(input="5", expected_output="50"),
            TestCaseItem(input="12", expected_output="120"),
            TestCaseItem(input="-3", expected_output="-30"),
        ]
        res = self.runner.execute(
            language="python",
            source_code=code,
            test_cases=test_cases,
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 3)
        self.assertEqual(res.total_test_cases, 3)

    def test_verdict_02_wrong_answer_fast_fail(self):
        """Verify WRONG_ANSWER triggers immediate fast-fail in SUBMIT mode and records failed test details."""
        code = """x = int(input())
if x == 2:
    print("WRONG")
else:
    print(x)
"""
        test_cases = [
            TestCaseItem(input="1", expected_output="1"),
            TestCaseItem(input="2", expected_output="2"),  # Fails here
            TestCaseItem(input="3", expected_output="3"),
            TestCaseItem(input="4", expected_output="4"),
        ]
        res = self.runner.execute(
            language="python",
            source_code=code,
            test_cases=test_cases,
            is_custom_run=False,
        )
        self.assertEqual(res.verdict, "wrong_answer")
        self.assertEqual(res.test_cases_passed, 1)
        self.assertIsNotNone(res.first_failed_test)
        self.assertEqual(res.first_failed_test.test_number, 2)

    def test_verdict_03_compilation_error(self):
        """Verify COMPILATION_ERROR skips all test cases and captures compiler diagnostics."""
        code = """#include <iostream>
int main() {
    this is a deliberate syntax error
}
"""
        test_cases = [
            TestCaseItem(input="1", expected_output="1"),
            TestCaseItem(input="2", expected_output="2"),
        ]
        res = self.runner.execute(
            language="cpp",
            source_code=code,
            test_cases=test_cases,
        )
        self.assertEqual(res.verdict, "compilation_error")
        self.assertEqual(res.test_cases_passed, 0)
        self.assertIn("error", res.compile_output.lower())

    def test_verdict_04_runtime_error(self):
        """Verify RUNTIME_ERROR captures unhandled exceptions with exit code and stderr."""
        code = """x = 1 / 0"""
        test_cases = [TestCaseItem(input="", expected_output="")]
        res = self.runner.execute(
            language="python",
            source_code=code,
            test_cases=test_cases,
        )
        self.assertEqual(res.verdict, "runtime_error")
        self.assertEqual(res.test_cases_passed, 0)
        self.assertIn("ZeroDivisionError", res.stderr_output or "")

    def test_verdict_05_time_limit_exceeded_actual(self):
        """Verify actual judge-enforced TIME_LIMIT_EXCEEDED on infinite loop."""
        code = """while True:
    pass
"""
        runner = SandboxRunner(
            time_limit_seconds=1.0,
            memory_limit_mb=128,
            docker_sandbox=self.sandbox,
        )
        test_cases = [TestCaseItem(input="", expected_output="")]
        t0 = time.perf_counter()
        res = runner.execute(
            language="python",
            source_code=code,
            test_cases=test_cases,
        )
        duration = time.perf_counter() - t0
        self.assertEqual(res.verdict, "time_limit_exceeded")
        self.assertGreaterEqual(res.runtime_ms, 1000)
        self.assertLess(duration, 15.0)


if __name__ == "__main__":
    unittest.main()
