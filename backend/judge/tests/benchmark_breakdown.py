"""Detailed Benchmark Profiling and Breakdown Script.

Measures each microsecond component:
- Container start & teardown overhead
- Compilation time
- Per-test process creation overhead
- Per-test execution time
- Filesystem cleanup overhead
- Input parsing & logic complexity comparison (Medium 150 vs Hard 200)
"""
import os
import sys
import time
import json
from pathlib import Path

# Add backend/judge to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.runner.docker_sandbox import DockerSandbox
from src.runner.sandbox import SandboxRunner, TestCaseItem


def profile_suite(name, code, test_cases):
    runner = SandboxRunner(time_limit_seconds=2.0, memory_limit_mb=256)
    
    t_start = time.perf_counter()
    res = runner.execute(
        language="java",
        source_code=code,
        test_cases=test_cases,
    )
    t_end = time.perf_counter()
    
    wall_ms = int((t_end - t_start) * 1000)
    telem = res.telemetry
    
    compile_ms = telem.compile_ms if telem else 0
    exec_ms = telem.execution_ms if telem else 0
    total_ms = telem.total_ms if telem else 0
    
    print(f"\n==========================================")
    print(f"PROFILE: {name} ({len(test_cases)} tests)")
    print(f"==========================================")
    print(f"Verdict: {res.verdict}")
    print(f"Passed: {res.test_cases_passed}/{res.total_test_cases}")
    print(f"Slowest Single Test: {res.runtime_ms} ms")
    print(f"Compilation: {compile_ms} ms")
    print(f"Execution Loop: {exec_ms} ms")
    print(f"Total Wall Clock: {wall_ms} ms")
    avg_per_test = (exec_ms - compile_ms) / len(test_cases) if len(test_cases) > 0 else 0
    print(f"Average Wall Time per Test: {avg_per_test:.2f} ms")
    return {
        "name": name,
        "count": len(test_cases),
        "compile_ms": compile_ms,
        "exec_ms": exec_ms,
        "wall_ms": wall_ms,
        "slowest_test_ms": res.runtime_ms,
        "avg_per_test_ms": avg_per_test,
    }


def main():
    # 1. Easy 80
    code_easy = """import java.util.Scanner;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int x = sc.nextInt();
        System.out.println(x * 2);
    }
}
"""
    tc_easy = [TestCaseItem(input=str(i), expected_output=str(i * 2)) for i in range(80)]
    r_easy = profile_suite("Easy 80 (Single int multiply)", code_easy, tc_easy)

    # 2. Medium 150 (As written in original test: 2 ints, String concatenation)
    code_med_orig = """import java.util.Scanner;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println("[" + a + "," + b + "]");
    }
}
"""
    tc_med_orig = [TestCaseItem(input=f"{i} {i+5}", expected_output=f"[{i},{i+5}]") for i in range(150)]
    r_med_orig = profile_suite("Medium 150 (Two ints + string concat)", code_med_orig, tc_med_orig)

    # 3. Hard 200 (As written in original test: 1 int square)
    code_hard_orig = """import java.util.Scanner;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int x = sc.nextInt();
        System.out.println(x * x);
    }
}
"""
    tc_hard_orig = [TestCaseItem(input=str(i), expected_output=str(i * i)) for i in range(200)]
    r_hard_orig = profile_suite("Hard 200 (Single int square)", code_hard_orig, tc_hard_orig)

    # 4. Controlled Test: Medium with identical logic as Hard (Single int square, 150 tests)
    tc_med_ctrl = [TestCaseItem(input=str(i), expected_output=str(i * i)) for i in range(150)]
    r_med_ctrl = profile_suite("Controlled Medium 150 (Single int square)", code_hard_orig, tc_med_ctrl)

    # 5. Controlled Test: Hard with identical logic as Medium (Two ints + string concat, 200 tests)
    tc_hard_ctrl = [TestCaseItem(input=f"{i} {i+5}", expected_output=f"[{i},{i+5}]") for i in range(200)]
    r_hard_ctrl = profile_suite("Controlled Hard 200 (Two ints + string concat)", code_med_orig, tc_hard_ctrl)

    print("\n\n==========================================")
    print("SUMMARY COMPARISON RESULTS")
    print("==========================================")
    print(json.dumps([r_easy, r_med_orig, r_hard_orig, r_med_ctrl, r_hard_ctrl], indent=2))


if __name__ == "__main__":
    main()
