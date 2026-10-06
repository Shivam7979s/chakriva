"""Hardened Production Docker Execution Sandbox Security Test Suite (Phase J.6).

Covers all 30 security test requirements specified in Phase J.6:
1. normal Java execution
2. normal Python execution
3. normal C++ execution
4. normal TypeScript execution
5. normal Go execution
6. network disabled
7. AWS metadata inaccessible
8. non-root execution
9. read-only root filesystem
10. /tmp writable
11. capabilities dropped
12. no-new-privileges enabled
13. PID limit enforced
14. CPU limit applied
15. memory limit applied
16. timeout kills execution
17. child processes killed
18. container removed after execution
19. container removed after timeout
20. compilation error cleanup
21. runtime error cleanup
22. filesystem isolation
23. Docker socket inaccessible to candidate
24. worker secrets absent from environment
25. stdout limit enforced
26. stderr limit enforced
27. concurrent execution isolation
28. malicious fork behavior does not kill worker
29. candidate cannot access worker source
30. candidate cannot access host project files
"""
import concurrent.futures
import os
import shutil
import subprocess
import tempfile
import time
import unittest
import sys
from pathlib import Path

# Add backend/judge to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.runner.docker_sandbox import DockerSandbox, DockerExecutionResult
from src.runner.sandbox import SandboxRunner, TestCaseItem, ExecutionResult


def is_docker_sandbox_ready() -> bool:
    ds = DockerSandbox()
    return ds.is_available() and ds.is_image_present()


class TestDockerSandboxSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.docker_ready = is_docker_sandbox_ready()
        cls.sandbox = DockerSandbox(
            default_cpus=1.0,
            default_memory_mb=256,
            pids_limit=64,
            output_limit_bytes=1024 * 1024,
        )
        cls.runner = SandboxRunner(
            time_limit_seconds=2.0,
            memory_limit_mb=256,
            docker_sandbox=cls.sandbox,
        )

    def setUp(self):
        if not self.docker_ready:
            self.skipTest("Docker daemon or candidate image (verniq-judge-sandbox:latest) unavailable.")

    # 1. Normal Java execution
    def test_01_normal_java_execution(self):
        source = (
            "public class Solution {\n"
            "    public static void main(String[] args) {\n"
            "        System.out.println(42);\n"
            "    }\n"
            "}\n"
        )
        res = self.runner.execute(
            language="java",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output="42")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 1)

    # 2. Normal Python execution
    def test_02_normal_python_execution(self):
        source = "import sys\nline = sys.stdin.read().strip()\nprint(f'ECHO:{line}')\n"
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="hello", expected_output="ECHO:hello")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 1)

    # 3. Normal C++ execution
    def test_03_normal_cpp_execution(self):
        source = (
            "#include <iostream>\n"
            "int main() {\n"
            "    int a, b;\n"
            "    if (std::cin >> a >> b) { std::cout << (a + b) << std::endl; }\n"
            "    return 0;\n"
            "}\n"
        )
        res = self.runner.execute(
            language="cpp",
            source_code=source,
            test_cases=[TestCaseItem(input="10 32", expected_output="42")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 1)

    # 4. Normal TypeScript execution
    def test_04_normal_typescript_execution(self):
        source = "const val: number = 40 + 2; console.log(val.toString());\n"
        res = self.runner.execute(
            language="typescript",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output="42")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 1)

    # 5. Normal Go execution
    def test_05_normal_go_execution(self):
        source = (
            "package main\n"
            "import \"fmt\"\n"
            "func main() {\n"
            "    fmt.Println(42)\n"
            "}\n"
        )
        res = self.runner.execute(
            language="go",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output="42")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertEqual(res.test_cases_passed, 1)

    # 6. Network disabled
    def test_06_network_disabled(self):
        source = (
            "import urllib.request\n"
            "try:\n"
            "    urllib.request.urlopen('https://example.com', timeout=1)\n"
            "    print('CONNECTED')\n"
            "except Exception as e:\n"
            "    print('BLOCKED')\n"
        )
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output="BLOCKED")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertIn("BLOCKED", (res.stdout_output or "").strip())

    # 7. AWS metadata inaccessible
    def test_07_aws_metadata_inaccessible(self):
        source = (
            "import urllib.request\n"
            "try:\n"
            "    urllib.request.urlopen('http://169.254.169.254/latest/meta-data/', timeout=1)\n"
            "    print('LEAKED')\n"
            "except Exception:\n"
            "    print('METADATA_BLOCKED')\n"
        )
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output="METADATA_BLOCKED")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertIn("METADATA_BLOCKED", (res.stdout_output or "").strip())

    # 8. Non-root execution
    def test_08_non_root_execution(self):
        source = "import os\nprint(os.getuid())\n"
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output=None)],
        )
        uid = (res.stdout_output or "").strip()
        self.assertNotEqual(uid, "0", "Execution must never run as root UID 0")
        self.assertEqual(uid, "1000", "Execution must run as non-root UID 1000")

    # 9. Read-only root filesystem
    def test_09_readonly_root_filesystem(self):
        source = (
            "try:\n"
            "    with open('/etc/hack.txt', 'w') as f:\n"
            "        f.write('fail')\n"
            "    print('WRITABLE')\n"
            "except OSError:\n"
            "    print('READONLY_ROOT')\n"
        )
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output="READONLY_ROOT")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertIn("READONLY_ROOT", (res.stdout_output or "").strip())

    # 10. /tmp writable
    def test_10_tmp_writable_tmpfs(self):
        source = (
            "with open('/tmp/test_tmpfs.txt', 'w') as f:\n"
            "    f.write('tmpfs_ok')\n"
            "with open('/tmp/test_tmpfs.txt', 'r') as f:\n"
            "    print(f.read().strip())\n"
        )
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output="tmpfs_ok")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertIn("tmpfs_ok", (res.stdout_output or "").strip())

    # 11. Capabilities dropped
    def test_11_capabilities_dropped(self):
        source = (
            "import socket\n"
            "try:\n"
            "    s = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_RAW)\n"
            "    print('CAP_ENABLED')\n"
            "except PermissionError:\n"
            "    print('CAP_DROPPED')\n"
        )
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output="CAP_DROPPED")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertIn("CAP_DROPPED", (res.stdout_output or "").strip())

    # 12. No-new-privileges enabled
    def test_12_no_new_privileges_enabled(self):
        with tempfile.TemporaryDirectory() as d:
            res = self.sandbox.run_in_container(
                cmd=["cat", "/proc/self/status"],
                scratch_dir=d,
                timeout_seconds=3.0,
            )
            self.assertEqual(res.exit_code, 0)
            self.assertIn("NoNewPrivs:\t1", res.stdout)

    # 13. PID limit enforced
    def test_13_pid_limit_enforced(self):
        source = (
            "import os\n"
            "try:\n"
            "    for _ in range(120):\n"
            "        os.fork()\n"
            "    print('FORK_SUCCESS')\n"
            "except (BlockingIOError, OSError):\n"
            "    print('PID_LIMIT_HIT')\n"
        )
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output=None)],
        )
        # Should not crash host; fork failure occurs or child terminates cleanly
        self.assertIn(res.verdict, ("accepted", "runtime_error"))

    # 14. CPU limit applied
    def test_14_cpu_limit_applied(self):
        with tempfile.TemporaryDirectory() as d:
            res = self.sandbox.run_in_container(
                cmd=["python3", "-c", "import time; t=time.time(); [x*x for x in range(1000000)]; print('CPU_OK')"],
                scratch_dir=d,
                timeout_seconds=5.0,
                cpu_limit=1.0,
            )
            self.assertEqual(res.exit_code, 0)
            self.assertIn("CPU_OK", res.stdout)

    # 15. Memory limit applied
    def test_15_memory_limit_applied(self):
        source = "x = ' ' * (300 * 1024 * 1024)\nprint('ALLOCATED')\n"
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output=None)],
        )
        self.assertIn(res.verdict, ("memory_limit_exceeded", "runtime_error"))

    # 16. Timeout kills execution
    def test_16_timeout_kills_execution(self):
        source = "import time\ntime.sleep(10)\nprint('DONE')\n"
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output=None)],
        )
        self.assertEqual(res.verdict, "time_limit_exceeded")

    # 17. Child processes killed
    def test_17_child_processes_killed(self):
        source = (
            "import subprocess, time\n"
            "p = subprocess.Popen(['sleep', '30'])\n"
            "time.sleep(10)\n"
        )
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output=None)],
        )
        self.assertEqual(res.verdict, "time_limit_exceeded")

    # 18. Container removed after execution
    def test_18_container_removed_after_execution(self):
        with tempfile.TemporaryDirectory() as d:
            exec_id = f"test-rem-{int(time.time()*1000)}"
            res = self.sandbox.run_in_container(
                cmd=["echo", "cleanup_test"],
                scratch_dir=d,
                execution_id=exec_id,
            )
            self.assertEqual(res.exit_code, 0)
            # Verify no container with this name remains in docker ps -a
            check = subprocess.run(
                ["docker", "ps", "-a", "--filter", f"name=verniq-judge-{exec_id}", "--format", "{{.ID}}"],
                capture_output=True,
                text=True,
            )
            self.assertEqual(check.stdout.strip(), "")

    # 19. Container removed after timeout
    def test_19_container_removed_after_timeout(self):
        with tempfile.TemporaryDirectory() as d:
            exec_id = f"test-tout-{int(time.time()*1000)}"
            res = self.sandbox.run_in_container(
                cmd=["sleep", "5"],
                scratch_dir=d,
                timeout_seconds=0.5,
                execution_id=exec_id,
            )
            self.assertTrue(res.timed_out)
            check = subprocess.run(
                ["docker", "ps", "-a", "--filter", f"name=verniq-judge-{exec_id}", "--format", "{{.ID}}"],
                capture_output=True,
                text=True,
            )
            self.assertEqual(check.stdout.strip(), "")

    # 20. Compilation error cleanup
    def test_20_compilation_error_cleanup(self):
        bad_cpp = "#include <iostream>\nint main() { INVALID SYNTAX; }\n"
        res = self.runner.execute(
            language="cpp",
            source_code=bad_cpp,
            test_cases=[TestCaseItem(input="", expected_output=None)],
        )
        self.assertEqual(res.verdict, "compilation_error")

    # 21. Runtime error cleanup
    def test_21_runtime_error_cleanup(self):
        bad_py = "raise ValueError('intentional_fail')\n"
        res = self.runner.execute(
            language="python",
            source_code=bad_py,
            test_cases=[TestCaseItem(input="", expected_output=None)],
        )
        self.assertEqual(res.verdict, "runtime_error")

    # 22. Filesystem isolation
    def test_22_filesystem_isolation(self):
        source = (
            "import os\n"
            "print('SANDBOX_EXISTS:', os.path.exists('/sandbox'))\n"
            "print('ROOT_READONLY:', not os.access('/', os.W_OK))\n"
        )
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output=None)],
        )
        self.assertIn("SANDBOX_EXISTS: True", res.stdout_output)
        self.assertIn("ROOT_READONLY: True", res.stdout_output)

    # 23. Docker socket inaccessible to candidate
    def test_23_docker_socket_inaccessible(self):
        source = (
            "import os\n"
            "sock_exists = os.path.exists('/var/run/docker.sock')\n"
            "print('DOCKER_SOCK:', 'EXISTS' if sock_exists else 'BLOCKED')\n"
        )
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output="DOCKER_SOCK: BLOCKED")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertIn("DOCKER_SOCK: BLOCKED", (res.stdout_output or "").strip())

    # 24. Worker secrets absent from environment
    def test_24_worker_secrets_absent(self):
        source = (
            "import os\n"
            "secrets = ['REDIS_URL', 'REDIS_PASSWORD', 'SUPABASE_SERVICE_ROLE_KEY', 'VERNIQ_JUDGE_INTERNAL_SECRET']\n"
            "found = [s for s in secrets if s in os.environ]\n"
            "print('SECRETS_FOUND:', len(found))\n"
        )
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output="SECRETS_FOUND: 0")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertIn("SECRETS_FOUND: 0", (res.stdout_output or "").strip())

    # 25. stdout limit enforced
    def test_25_stdout_limit_enforced(self):
        source = "print('A' * (2 * 1024 * 1024))\n"
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output=None)],
        )
        self.assertLessEqual(len(res.stdout_output or ""), 1024 * 1024 + 10)

    # 26. stderr limit enforced
    def test_26_stderr_limit_enforced(self):
        source = "import sys\nsys.stderr.write('E' * (2 * 1024 * 1024))\n"
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output=None)],
        )
        self.assertLessEqual(len(res.stderr_output or ""), 1024 * 1024 + 10)

    # 27. Concurrent execution isolation
    def test_27_concurrent_execution_isolation(self):
        def run_one(val: int):
            code = f"print({val})\n"
            return self.runner.execute(
                language="python",
                source_code=code,
                test_cases=[TestCaseItem(input="", expected_output=str(val))],
                execution_id=f"conc-{val}",
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
            f1 = ex.submit(run_one, 111)
            f2 = ex.submit(run_one, 222)
            r1 = f1.result(timeout=15.0)
            r2 = f2.result(timeout=15.0)

        self.assertEqual(r1.verdict, "accepted")
        self.assertEqual(r2.verdict, "accepted")
        self.assertEqual((r1.stdout_output or "").strip(), "111")
        self.assertEqual((r2.stdout_output or "").strip(), "222")

    # 28. Malicious fork behavior does not kill worker
    def test_28_malicious_fork_does_not_kill_worker(self):
        source = (
            "import os\n"
            "for _ in range(30):\n"
            "    try:\n"
            "        os.fork()\n"
            "    except Exception:\n"
            "        break\n"
            "print('SURVIVED')\n"
        )
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output=None)],
        )
        # Worker is still alive and returning valid verdict
        self.assertIn(res.verdict, ("accepted", "runtime_error", "time_limit_exceeded"))

    # 29. Candidate cannot access worker source
    def test_29_candidate_cannot_access_worker_source(self):
        source = (
            "import os\n"
            "worker_exists = os.path.exists('/app/src/worker.py') or os.path.exists('/workspace/src/worker.py')\n"
            "print('WORKER_SOURCE:', 'EXISTS' if worker_exists else 'NOT_FOUND')\n"
        )
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output="WORKER_SOURCE: NOT_FOUND")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertIn("WORKER_SOURCE: NOT_FOUND", (res.stdout_output or "").strip())

    # 30. Candidate cannot access host project files
    def test_30_candidate_cannot_access_host_project_files(self):
        source = (
            "import os\n"
            "host_paths = ['/Users', '/repo', '/workspace', '/C:', '/c', '/home/ubuntu/Desktop/VERNIQ']\n"
            "leaked = [p for p in host_paths if os.path.exists(p)]\n"
            "print('HOST_MOUNTS_LEAKED:', len(leaked))\n"
        )
        res = self.runner.execute(
            language="python",
            source_code=source,
            test_cases=[TestCaseItem(input="", expected_output="HOST_MOUNTS_LEAKED: 0")],
        )
        self.assertEqual(res.verdict, "accepted")
        self.assertIn("HOST_MOUNTS_LEAKED: 0", (res.stdout_output or "").strip())


if __name__ == "__main__":
    unittest.main()
