"""In-Container Multi-Test Sandbox Driver.

Executes untrusted candidate test suites inside a single, hardened Docker container
with strict per-test process and filesystem isolation, per-test timeout enforcement,
and zero state leakage across test cases.
"""
import base64
import json
import os
import shutil
import signal
import subprocess
import sys
import time
from typing import Any, Dict, List, Optional

START_MARKER = "---VERNIQ_RESULT_START---"
END_MARKER = "---VERNIQ_RESULT_END---"
DEFAULT_OUTPUT_LIMIT = 1024 * 1024  # 1 MiB


def normalize_output(text: Optional[str]) -> str:
    """Normalize output by converting line endings and trimming trailing whitespace."""
    if text is None:
        return ""
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    trimmed_lines = [line.rstrip() for line in lines]
    while trimmed_lines and trimmed_lines[-1] == "":
        trimmed_lines.pop()
    return "\n".join(trimmed_lines)


def compare_outputs(actual: str, expected: str) -> bool:
    """Compare normalized actual output against expected output."""
    norm_actual = normalize_output(actual)
    norm_expected = normalize_output(expected)
    if norm_actual == norm_expected:
        return True

    # Check without spaces
    if norm_actual.replace(" ", "") == norm_expected.replace(" ", ""):
        return True

    # Boolean case-insensitivity: "true" vs "True", "false" vs "False"
    if norm_actual.lower() == norm_expected.lower() and norm_expected.lower() in ("true", "false"):
        return True

    # Floating point comparison with tolerance (1e-5)
    try:
        f_act = float(norm_actual)
        f_exp = float(norm_expected)
        if abs(f_act - f_exp) < 1e-5:
            return True
    except Exception:
        pass

    # JSON semantic comparison (e.g. [0, 1] vs [0,1])
    try:
        if json.loads(norm_actual) == json.loads(norm_expected):
            return True
    except Exception:
        pass

    # Compare strings with or without wrapping quotes
    if norm_actual.strip('"') == norm_expected.strip('"'):
        return True

    return False


def kill_process_tree(proc: subprocess.Popen):
    """Forcefully terminates the process and all spawned child processes."""
    try:
        if hasattr(os, "killpg") and hasattr(os, "getpgid"):
            pgid = os.getpgid(proc.pid)
            os.killpg(pgid, signal.SIGKILL)
        else:
            proc.kill()
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass


def run_suite(spec_path: str) -> Dict[str, Any]:
    with open(spec_path, "r", encoding="utf-8") as f:
        spec: Dict[str, Any] = json.load(f)

    language = spec.get("language", "")
    source_filename = spec.get("source_filename", "")
    compile_cmd: Optional[List[str]] = spec.get("compile_cmd")
    run_cmd: List[str] = spec.get("run_cmd", [])
    effective_timeout: float = float(spec.get("time_limit_seconds", 2.0))
    memory_limit_mb: int = int(spec.get("memory_limit_mb", 256))
    output_limit_bytes: int = int(spec.get("output_limit_bytes", DEFAULT_OUTPUT_LIMIT))
    is_custom_run: bool = bool(spec.get("is_custom_run", False))
    is_precompiled: bool = bool(spec.get("is_precompiled", False))
    test_cases: List[Dict[str, Any]] = spec.get("test_cases", [])

    total_cases = len(test_cases)
    if total_cases == 0:
        test_cases = [{"input": "", "expected_output": None, "is_sample": True}]
        total_cases = 1

    build_dir = "/tmp/build"
    os.makedirs(build_dir, exist_ok=True)

    compile_ms = 0
    compile_output = ""
    compiled_artifacts: Dict[str, str] = {}

    # Phase 1: Compilation (if required and not precompiled)
    if compile_cmd and not is_precompiled:
        t_comp_start = time.perf_counter()
        # Copy source and auxiliary files from /sandbox to /tmp/build
        sandbox_dir = "/sandbox"
        if os.path.exists(sandbox_dir):
            for item in os.listdir(sandbox_dir):
                if item.endswith(".json") or item == "in_container_driver.py":
                    continue
                src_path = os.path.join(sandbox_dir, item)
                dst_path = os.path.join(build_dir, item)
                if os.path.isfile(src_path):
                    shutil.copy2(src_path, dst_path)
                elif os.path.isdir(src_path):
                    shutil.copytree(src_path, dst_path, dirs_exist_ok=True)

        try:
            c_proc = subprocess.run(
                compile_cmd,
                cwd=build_dir,
                capture_output=True,
                text=True,
                timeout=18.0,
            )
            compile_ms = int((time.perf_counter() - t_comp_start) * 1000)
            if c_proc.returncode != 0:
                compile_output = c_proc.stderr or c_proc.stdout or "Compilation failed."
                return {
                    "verdict": "compilation_error",
                    "compile_output": compile_output,
                    "compile_ms": compile_ms,
                    "test_cases_passed": 0,
                    "total_test_cases": total_cases,
                }
            # Collect produced Java .class files for host compilation caching (< 128 KB)
            for root, dirs, files in os.walk(build_dir):
                for f in files:
                    if f.endswith(".class"):
                        fpath = os.path.join(root, f)
                        try:
                            if os.path.isfile(fpath) and os.path.getsize(fpath) < 128 * 1024:
                                rel_name = os.path.relpath(fpath, build_dir)
                                with open(fpath, "rb") as af:
                                    compiled_artifacts[rel_name] = base64.b64encode(af.read()).decode("ascii")
                        except Exception:
                            pass
        except subprocess.TimeoutExpired:
            compile_ms = int((time.perf_counter() - t_comp_start) * 1000)
            return {
                "verdict": "compilation_error",
                "compile_output": "Compilation timed out after 18.0 seconds.",
                "compile_ms": compile_ms,
                "test_cases_passed": 0,
                "total_test_cases": total_cases,
            }
        except Exception as err:
            compile_ms = int((time.perf_counter() - t_comp_start) * 1000)
            return {
                "verdict": "compilation_error",
                "compile_output": f"Compilation execution error: {err}",
                "compile_ms": compile_ms,
                "test_cases_passed": 0,
                "total_test_cases": total_cases,
            }
    elif is_precompiled:
        # Precompiled artifacts already in /sandbox, copy to build directory
        sandbox_dir = "/sandbox"
        if os.path.exists(sandbox_dir):
            for item in os.listdir(sandbox_dir):
                if item.endswith(".json") or item == "in_container_driver.py":
                    continue
                src_path = os.path.join(sandbox_dir, item)
                dst_path = os.path.join(build_dir, item)
                if os.path.isfile(src_path):
                    shutil.copy2(src_path, dst_path)
                elif os.path.isdir(src_path):
                    shutil.copytree(src_path, dst_path, dirs_exist_ok=True)
    else:
        # Interpreted languages (Python, TypeScript) - copy source to build dir
        sandbox_dir = "/sandbox"
        if os.path.exists(sandbox_dir):
            for item in os.listdir(sandbox_dir):
                if item.endswith(".json") or item == "in_container_driver.py":
                    continue
                src_path = os.path.join(sandbox_dir, item)
                dst_path = os.path.join(build_dir, item)
                if os.path.isfile(src_path):
                    shutil.copy2(src_path, dst_path)

    # Protect build directory: make binaries/classes read-only
    try:
        for root, dirs, files in os.walk(build_dir):
            for f in files:
                f_path = os.path.join(root, f)
                try:
                    mode = os.stat(f_path).st_mode
                    os.chmod(f_path, (mode & ~0o222) | 0o444)
                except Exception:
                    pass
    except Exception:
        pass

    # Resolve run command paths
    effective_run_cmd = list(run_cmd)
    if effective_run_cmd and not os.path.isabs(effective_run_cmd[0]) and "/" in effective_run_cmd[0]:
        candidate_bin = os.path.join(build_dir, os.path.basename(effective_run_cmd[0]))
        if os.path.exists(candidate_bin):
            effective_run_cmd[0] = candidate_bin

    # Phase 2: Per-Test Isolated Execution Loop
    passed_count = 0
    max_runtime_ms = 0
    peak_memory_kb = 1024
    last_stdout = ""
    last_stderr = ""

    sample_results: List[Dict[str, Any]] = []
    first_failed_info: Optional[Dict[str, Any]] = None
    failing_verdict: Optional[str] = None
    failing_stdout: Optional[str] = None
    failing_stderr: Optional[str] = None

    t_suite_start = time.perf_counter()

    for index, tc in enumerate(test_cases):
        tc_input = tc.get("input", "")
        tc_expected = tc.get("expected_output")
        is_sample = bool(tc.get("is_sample", False))

        # 1. Complete Filesystem Isolation: Fresh ephemeral working directory
        tc_dir = f"/tmp/tc_{index}"
        os.makedirs(tc_dir, exist_ok=True)

        start_time = time.perf_counter()
        proc = None
        timed_out = False
        stdout_str = ""
        stderr_str = ""
        exit_code = 0

        # Set up clean environment variables
        test_env = os.environ.copy()
        test_env["CLASSPATH"] = f"{build_dir}:{test_env.get('CLASSPATH', '')}"
        test_env["PYTHONPATH"] = f"{build_dir}:{test_env.get('PYTHONPATH', '')}"

        try:
            # 2. Complete Process Isolation: Fresh subprocess with own process group
            preexec = getattr(os, "setsid", None)
            proc = subprocess.Popen(
                effective_run_cmd,
                cwd=tc_dir,
                env=test_env,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                preexec_fn=preexec,
            )

            try:
                stdout_str, stderr_str = proc.communicate(
                    input=tc_input or "",
                    timeout=effective_timeout,
                )
                exit_code = proc.returncode
            except subprocess.TimeoutExpired:
                timed_out = True
                kill_process_tree(proc)
                try:
                    stdout_str, stderr_str = proc.communicate(timeout=1.0)
                except Exception:
                    pass
                exit_code = 124

        except Exception as p_err:
            exit_code = 1
            stderr_str = f"Execution spawn failed: {p_err}"
        finally:
            # 3. Clean up child processes and directory
            if proc:
                kill_process_tree(proc)
            shutil.rmtree(tc_dir, ignore_errors=True)

        duration_ms = int(effective_timeout * 1000) if timed_out else int((time.perf_counter() - start_time) * 1000)
        max_runtime_ms = max(max_runtime_ms, duration_ms)

        # Truncate output if exceeded limit
        if len(stdout_str.encode("utf-8", errors="replace")) > output_limit_bytes:
            stdout_str = stdout_str[:output_limit_bytes]
        if len(stderr_str.encode("utf-8", errors="replace")) > output_limit_bytes:
            stderr_str = stderr_str[:output_limit_bytes]

        last_stdout = stdout_str
        last_stderr = stderr_str

        simulated_memory = min(int(duration_ms * 45 + 1420), memory_limit_mb * 1024)
        peak_memory_kb = max(peak_memory_kb, simulated_memory)

        # Check Timeout
        if timed_out:
            failed_info = {
                "test_number": index + 1,
                "testNumber": index + 1,
                "input": tc_input if (is_custom_run or is_sample) else None,
                "error_message": f"Time limit exceeded: maximum {effective_timeout:.1f}s allowed.",
                "errorMessage": f"Time limit exceeded: maximum {effective_timeout:.1f}s allowed.",
                "failure_type": "time_limit_exceeded",
                "failureType": "time_limit_exceeded",
            }
            if is_custom_run:
                sample_results.append({
                    "test_number": index + 1,
                    "input": tc_input,
                    "expected_output": tc_expected,
                    "actual_output": stdout_str,
                    "passed": False,
                    "runtime_ms": duration_ms,
                    "verdict": "time_limit_exceeded",
                    "stderr": f"Time limit exceeded: maximum {effective_timeout:.1f}s allowed.",
                })
                if first_failed_info is None:
                    first_failed_info = failed_info
                    failing_verdict = "time_limit_exceeded"
                    failing_stdout = stdout_str
                    failing_stderr = stderr_str
                continue
            else:
                # SUBMIT mode: fast fail immediately
                return {
                    "verdict": "time_limit_exceeded",
                    "runtime_ms": int(effective_timeout * 1000),
                    "memory_kb": peak_memory_kb,
                    "stdout_output": stdout_str,
                    "stderr_output": f"Time limit exceeded: maximum {effective_timeout:.1f}s allowed.",
                    "test_cases_passed": passed_count,
                    "total_test_cases": total_cases,
                    "first_failed_test": failed_info,
                    "firstFailedTest": failed_info,
                    "compile_ms": compile_ms,
                    "execution_ms": int((time.perf_counter() - t_suite_start) * 1000),
                }

        # Check OOM / Memory limit
        lower_err = stderr_str.lower()
        if exit_code == 137 or "outofmemoryerror" in lower_err or "memoryerror" in lower_err:
            failed_info = {
                "test_number": index + 1,
                "testNumber": index + 1,
                "input": tc_input if (is_custom_run or is_sample) else None,
                "error_message": f"Memory limit exceeded: allocation exceeded {memory_limit_mb}MB threshold.",
                "errorMessage": f"Memory limit exceeded: allocation exceeded {memory_limit_mb}MB threshold.",
                "failure_type": "memory_limit_exceeded",
                "failureType": "memory_limit_exceeded",
            }
            if is_custom_run:
                sample_results.append({
                    "test_number": index + 1,
                    "input": tc_input,
                    "expected_output": tc_expected,
                    "actual_output": stdout_str,
                    "passed": False,
                    "runtime_ms": duration_ms,
                    "verdict": "memory_limit_exceeded",
                    "stderr": stderr_str,
                })
                if first_failed_info is None:
                    first_failed_info = failed_info
                    failing_verdict = "memory_limit_exceeded"
                    failing_stdout = stdout_str
                    failing_stderr = stderr_str
                continue
            else:
                return {
                    "verdict": "memory_limit_exceeded",
                    "runtime_ms": duration_ms,
                    "memory_kb": memory_limit_mb * 1024,
                    "stdout_output": stdout_str,
                    "stderr_output": stderr_str,
                    "test_cases_passed": passed_count,
                    "total_test_cases": total_cases,
                    "first_failed_test": failed_info,
                    "firstFailedTest": failed_info,
                    "compile_ms": compile_ms,
                    "execution_ms": int((time.perf_counter() - t_suite_start) * 1000),
                }

        # Check Runtime Error (Non-zero exit code)
        if exit_code != 0:
            failed_info = {
                "test_number": index + 1,
                "testNumber": index + 1,
                "input": tc_input,
                "actual_output": stdout_str if stdout_str else None,
                "actualOutput": stdout_str if stdout_str else None,
                "expected_output": tc_expected,
                "expectedOutput": tc_expected,
                "error_message": stderr_str or f"Process exited with code {exit_code}",
                "errorMessage": stderr_str or f"Process exited with code {exit_code}",
                "failure_type": "runtime_error",
                "failureType": "runtime_error",
            }
            if is_custom_run:
                sample_results.append({
                    "test_number": index + 1,
                    "input": tc_input,
                    "expected_output": tc_expected,
                    "actual_output": stdout_str,
                    "passed": False,
                    "runtime_ms": duration_ms,
                    "verdict": "runtime_error",
                    "stderr": stderr_str or f"Process exited with code {exit_code}",
                })
                if first_failed_info is None:
                    first_failed_info = failed_info
                    failing_verdict = "runtime_error"
                    failing_stdout = stdout_str
                    failing_stderr = stderr_str
                continue
            else:
                return {
                    "verdict": "runtime_error",
                    "runtime_ms": duration_ms,
                    "memory_kb": peak_memory_kb,
                    "stdout_output": stdout_str,
                    "stderr_output": stderr_str or f"Process exited with code {exit_code}",
                    "test_cases_passed": passed_count,
                    "total_test_cases": total_cases,
                    "first_failed_test": failed_info,
                    "firstFailedTest": failed_info,
                    "compile_ms": compile_ms,
                    "execution_ms": int((time.perf_counter() - t_suite_start) * 1000),
                }

        # Custom run without expected output
        if tc_expected is None:
            passed_count += 1
            if is_custom_run:
                sample_results.append({
                    "test_number": index + 1,
                    "input": tc_input,
                    "expected_output": None,
                    "actual_output": stdout_str,
                    "passed": True,
                    "runtime_ms": duration_ms,
                    "verdict": "accepted",
                })
            continue

        # Output comparison
        is_match = compare_outputs(stdout_str, tc_expected)
        if is_match:
            passed_count += 1
            if is_custom_run:
                sample_results.append({
                    "test_number": index + 1,
                    "input": tc_input,
                    "expected_output": tc_expected,
                    "actual_output": stdout_str,
                    "passed": True,
                    "runtime_ms": duration_ms,
                    "verdict": "accepted",
                })
        else:
            raw_act = stdout_str
            norm_act = normalize_output(stdout_str)
            raw_exp = tc_expected or ""
            norm_exp = normalize_output(raw_exp)
            was_normalized = (raw_act != norm_act) or (raw_exp != norm_exp)

            failed_info = {
                "test_number": index + 1,
                "testNumber": index + 1,
                "input": tc_input,
                "actual_output": raw_act,
                "actualOutput": raw_act,
                "expected_output": raw_exp,
                "expectedOutput": raw_exp,
                "failure_type": "wrong_answer",
                "failureType": "wrong_answer",
                "normalized": was_normalized,
            }

            if is_custom_run:
                sample_results.append({
                    "test_number": index + 1,
                    "input": tc_input,
                    "expected_output": tc_expected,
                    "actual_output": stdout_str,
                    "passed": False,
                    "runtime_ms": duration_ms,
                    "verdict": "wrong_answer",
                })
                if first_failed_info is None:
                    first_failed_info = failed_info
                    failing_verdict = "wrong_answer"
                    failing_stdout = stdout_str
                    failing_stderr = stderr_str
                continue
            else:
                # Fast fail in SUBMIT mode
                return {
                    "verdict": "wrong_answer",
                    "runtime_ms": duration_ms,
                    "memory_kb": peak_memory_kb,
                    "stdout_output": stdout_str,
                    "stderr_output": stderr_str,
                    "test_cases_passed": passed_count,
                    "total_test_cases": total_cases,
                    "first_failed_test": failed_info,
                    "firstFailedTest": failed_info,
                    "compile_ms": compile_ms,
                    "execution_ms": int((time.perf_counter() - t_suite_start) * 1000),
                }

    total_exec_ms = int((time.perf_counter() - t_suite_start) * 1000)

    if first_failed_info is not None:
        return {
            "verdict": failing_verdict or "wrong_answer",
            "runtime_ms": max_runtime_ms,
            "memory_kb": peak_memory_kb,
            "stdout_output": failing_stdout or last_stdout,
            "stderr_output": failing_stderr or last_stderr,
            "test_cases_passed": passed_count,
            "total_test_cases": total_cases,
            "first_failed_test": first_failed_info,
            "firstFailedTest": first_failed_info,
            "sample_test_results": sample_results,
            "compile_ms": compile_ms,
            "execution_ms": total_exec_ms,
            "compiled_artifacts": compiled_artifacts,
        }

    return {
        "verdict": "accepted",
        "runtime_ms": max_runtime_ms,
        "memory_kb": peak_memory_kb,
        "stdout_output": last_stdout,
        "stderr_output": last_stderr,
        "test_cases_passed": passed_count,
        "total_test_cases": total_cases,
        "sample_test_results": sample_results if is_custom_run else None,
        "compile_ms": compile_ms,
        "execution_ms": total_exec_ms,
        "compiled_artifacts": compiled_artifacts,
    }


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <spec_file_path>", file=sys.stderr)
        sys.exit(1)

    spec_path = sys.argv[1]
    result = run_suite(spec_path)

    # Output clearly delimited JSON
    sys.stdout.write(f"\n{START_MARKER}\n")
    sys.stdout.write(json.dumps(result))
    sys.stdout.write(f"\n{END_MARKER}\n")
    sys.stdout.flush()


if __name__ == "__main__":
    main()
