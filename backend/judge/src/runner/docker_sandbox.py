"""Hardened Production Docker Execution Sandbox (Phase J.6).

Executes untrusted candidate code inside an air-gapped, resource-constrained,
ephemeral Docker container with a non-root user, read-only root filesystem,
tmpfs write boundary, dropped capabilities, and strict timeout/PID controls.
"""
import logging
import os
import shutil
import subprocess
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

logger = logging.getLogger("judge-docker-sandbox")

DEFAULT_IMAGE_NAME = "verniq-judge-sandbox:latest"
DEFAULT_CPUS = 1.0
DEFAULT_MEMORY_MB = 256
DEFAULT_PIDS_LIMIT = 64
DEFAULT_USER = "1000:1000"
DEFAULT_TMPFS_SIZE_MB = 64
DEFAULT_OUTPUT_LIMIT_BYTES = 1024 * 1024  # 1 MiB per stream


@dataclass
class DockerExecutionResult:
    """Outcome of a containerized execution."""
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int
    timed_out: bool = False
    oom_killed: bool = False
    output_truncated: bool = False


class DockerSandbox:
    """Manages container lifecycle, hardened execution parameters, and cleanup."""

    def __init__(
        self,
        image_name: str = DEFAULT_IMAGE_NAME,
        default_cpus: float = DEFAULT_CPUS,
        default_memory_mb: int = DEFAULT_MEMORY_MB,
        pids_limit: int = DEFAULT_PIDS_LIMIT,
        user: str = DEFAULT_USER,
        tmpfs_size_mb: int = DEFAULT_TMPFS_SIZE_MB,
        output_limit_bytes: int = DEFAULT_OUTPUT_LIMIT_BYTES,
        enabled: bool = True,
    ):
        self.image_name = image_name
        self.default_cpus = default_cpus
        self.default_memory_mb = default_memory_mb
        self.pids_limit = pids_limit
        self.user = user
        self.tmpfs_size_mb = tmpfs_size_mb
        self.output_limit_bytes = output_limit_bytes
        self.enabled = enabled

        # Telemetry counters
        self.containers_started = 0
        self.containers_completed = 0
        self.containers_failed = 0
        self.containers_timed_out = 0
        self.containers_cleaned = 0
        self.sandbox_errors = 0

    def is_available(self) -> bool:
        """Verifies Docker CLI and daemon availability."""
        if not self.enabled:
            return False
        if not shutil.which("docker"):
            return False
        try:
            res = subprocess.run(
                ["docker", "version"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=3.0,
            )
            return res.returncode == 0
        except Exception:
            return False

    def is_image_present(self) -> bool:
        """Verifies if the candidate sandbox image exists locally."""
        try:
            res = subprocess.run(
                ["docker", "image", "inspect", self.image_name],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=3.0,
            )
            return res.returncode == 0
        except Exception:
            return False

    def compile_in_container(
        self,
        compile_cmd: List[str],
        scratch_dir: str,
        timeout_seconds: float = 12.0,
        execution_id: str = "compile",
        memory_limit_mb: Optional[int] = None,
        cpu_limit: Optional[float] = None,
    ) -> DockerExecutionResult:
        """Compiles candidate source code inside a fresh, hardened Docker container.

        Enforces:
          - --network none (air-gapped)
          - --read-only root filesystem
          - --tmpfs /tmp:rw,exec,nosuid,size=Xm
          - --cap-drop ALL
          - --security-opt no-new-privileges:true
          - --pids-limit N
          - --memory Xm
          - --cpus C
          - --user UID:GID (non-root)
          - Isolated submission scratch directory mounted read-write for output artifacts
          - Guaranteed container removal in finally block
        """
        self.containers_started += 1
        safe_mem = memory_limit_mb or self.default_memory_mb
        safe_cpu = cpu_limit or self.default_cpus

        clean_exec_id = "".join(c for c in execution_id if c.isalnum() or c in "-_")[:48]
        container_name = f"verniq-judge-compile-{clean_exec_id}-{int(time.time() * 1000)}"
        abs_scratch = os.path.abspath(scratch_dir)

        escaped_cmd = " ".join(f'"{arg}"' if " " in arg or "*" in arg else arg for arg in compile_cmd)
        container_script = f"cd /sandbox && {escaped_cmd}"

        docker_cmd = [
            "docker", "run",
            "--name", container_name,
            "--network", "none",
            "--read-only",
            "--tmpfs", f"/tmp:rw,exec,nosuid,size={self.tmpfs_size_mb}m",
            "--cap-drop", "ALL",
            "--security-opt", "no-new-privileges:true",
            "--pids-limit", str(self.pids_limit),
            "--memory", f"{safe_mem}m",
            "--memory-swap", f"{safe_mem}m",
            "--cpus", str(safe_cpu),
            "--user", self.user,
            "-e", "GOCACHE=/tmp/go-cache",
            "-e", "GOTMPDIR=/tmp",
            "-e", "GOMAXPROCS=2",
            "-v", f"{abs_scratch}:/sandbox:rw",
            "-i",
            self.image_name,
            "sh", "-c", container_script,
        ]

        logger.debug("Starting compilation container %s", container_name)
        start_time = time.perf_counter()

        proc = None
        timed_out = False
        oom_killed = False
        stdout_bytes = b""
        stderr_bytes = b""

        try:
            proc = subprocess.Popen(
                docker_cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            try:
                stdout_bytes, stderr_bytes = proc.communicate(timeout=timeout_seconds)
            except subprocess.TimeoutExpired:
                timed_out = True
                self.containers_timed_out += 1
                logger.info("Compilation container %s timed out after %.2fs", container_name, timeout_seconds)
                try:
                    subprocess.run(["docker", "kill", container_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5.0)
                except Exception:
                    pass
                try:
                    stdout_bytes, stderr_bytes = proc.communicate(timeout=2.0)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass

        except Exception as err:
            self.sandbox_errors += 1
            self.containers_failed += 1
            logger.error("Compilation container error for %s: %s", container_name, err)
            raise RuntimeError(f"Docker compilation failed: {err}")

        finally:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            try:
                subprocess.run(
                    ["docker", "rm", "-f", container_name],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=3.0,
                )
                self.containers_cleaned += 1
            except Exception as clean_err:
                logger.warning("Error cleaning compilation container %s: %s", container_name, clean_err)

        output_truncated = False
        if len(stdout_bytes) > self.output_limit_bytes:
            stdout_bytes = stdout_bytes[:self.output_limit_bytes]
            output_truncated = True

        if len(stderr_bytes) > self.output_limit_bytes:
            stderr_bytes = stderr_bytes[:self.output_limit_bytes]
            output_truncated = True

        stdout_str = stdout_bytes.decode("utf-8", errors="replace")
        stderr_str = stderr_bytes.decode("utf-8", errors="replace")

        exit_code = proc.returncode if proc and proc.returncode is not None else (124 if timed_out else 1)
        if exit_code == 137 and not timed_out:
            oom_killed = True

        if exit_code == 0:
            self.containers_completed += 1
        elif not timed_out:
            self.containers_failed += 1

        return DockerExecutionResult(
            exit_code=exit_code,
            stdout=stdout_str,
            stderr=stderr_str,
            duration_ms=duration_ms,
            timed_out=timed_out,
            oom_killed=oom_killed,
            output_truncated=output_truncated,
        )

    def run_in_container(
        self,
        cmd: List[str],
        scratch_dir: str,
        stdin_data: str = "",
        timeout_seconds: float = 2.0,
        execution_id: str = "exec",
        memory_limit_mb: Optional[int] = None,
        cpu_limit: Optional[float] = None,
        on_proc_started: Optional[Any] = None,
    ) -> DockerExecutionResult:
        """Executes a command inside a fresh, hardened Docker container.

        Enforces:
          - --network none (air-gapped)
          - --read-only root filesystem
          - --tmpfs /tmp:rw,exec,nosuid,size=Xm
          - --cap-drop ALL
          - --security-opt no-new-privileges:true
          - --pids-limit N
          - --memory Xm
          - --memory-swap Xm (prevents swap breakout)
          - --cpus C
          - --user UID:GID (non-root)
          - read-only volume mount of ephemeral scratch directory to /sandbox:ro
          - Bounded stdout and stderr capture (output_limit_bytes)
          - Guaranteed container removal in finally block
        """
        self.containers_started += 1
        safe_mem = memory_limit_mb or self.default_memory_mb
        safe_cpu = cpu_limit or self.default_cpus

        # Generate a unique container identifier
        clean_exec_id = "".join(c for c in execution_id if c.isalnum() or c in "-_")[:48]
        container_name = f"verniq-judge-{clean_exec_id}-{int(time.time() * 1000)}"

        # Mount ephemeral workspace strictly read-only
        abs_scratch = os.path.abspath(scratch_dir)

        # Prepare bash execution script:
        # Copy read-only source/binary files from /sandbox into writable /tmp, then execute
        escaped_cmd = " ".join(f'"{arg}"' if " " in arg or "*" in arg else arg for arg in cmd)
        container_inner_script = (
            f"cp -r /sandbox/* /tmp/ 2>/dev/null || true; cd /tmp && {escaped_cmd}"
        )

        docker_cmd = [
            "docker", "run",
            "--name", container_name,
            "--network", "none",
            "--read-only",
            "--tmpfs", f"/tmp:rw,exec,nosuid,size={self.tmpfs_size_mb}m",
            "--cap-drop", "ALL",
            "--security-opt", "no-new-privileges:true",
            "--pids-limit", str(self.pids_limit),
            "--memory", f"{safe_mem}m",
            "--memory-swap", f"{safe_mem}m",
            "--cpus", str(safe_cpu),
            "--user", self.user,
            "-e", "GOCACHE=/tmp/go-cache",
            "-e", "GOTMPDIR=/tmp",
            "-e", "GOMAXPROCS=2",
            "-v", f"{abs_scratch}:/sandbox:ro",
            "-i",
            self.image_name,
            "sh", "-c", container_inner_script,
        ]

        logger.debug("Starting container %s with memory=%dm cpus=%.1f", container_name, safe_mem, safe_cpu)
        start_time = time.perf_counter()

        proc = None
        timed_out = False
        oom_killed = False
        stdout_bytes = b""
        stderr_bytes = b""

        try:
            proc = subprocess.Popen(
                docker_cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            if on_proc_started and callable(on_proc_started):
                try:
                    on_proc_started(proc, container_name)
                except Exception:
                    pass

            stdin_bytes = stdin_data.encode("utf-8") if stdin_data else None

            try:
                stdout_bytes, stderr_bytes = proc.communicate(
                    input=stdin_bytes,
                    timeout=timeout_seconds,
                )
            except subprocess.TimeoutExpired:
                timed_out = True
                self.containers_timed_out += 1
                logger.info("Execution container %s timed out after %.2fs", container_name, timeout_seconds)
                # Terminate running container forcefully
                try:
                    subprocess.run(["docker", "kill", container_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=6.0)
                except Exception:
                    pass
                try:
                    stdout_bytes, stderr_bytes = proc.communicate(timeout=2.0)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass

        except Exception as err:
            self.sandbox_errors += 1
            self.containers_failed += 1
            logger.error("Container execution error for %s: %s", container_name, err)
            raise RuntimeError(f"Docker sandbox execution failed: {err}")

        finally:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            # Guarantee container cleanup
            try:
                subprocess.run(
                    ["docker", "rm", "-f", container_name],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=6.0,
                )
                self.containers_cleaned += 1
            except Exception as clean_err:
                logger.warning("Error cleaning container %s: %s", container_name, clean_err)

        output_truncated = False
        if len(stdout_bytes) > self.output_limit_bytes:
            stdout_bytes = stdout_bytes[:self.output_limit_bytes]
            output_truncated = True

        if len(stderr_bytes) > self.output_limit_bytes:
            stderr_bytes = stderr_bytes[:self.output_limit_bytes]
            output_truncated = True

        stdout_str = stdout_bytes.decode("utf-8", errors="replace")
        stderr_str = stderr_bytes.decode("utf-8", errors="replace")

        exit_code = proc.returncode if proc and proc.returncode is not None else (124 if timed_out else 1)

        # Exit code 137 typically indicates SIGKILL / OOM or Docker timeout kill
        if exit_code == 137 and not timed_out:
            oom_killed = True

        if exit_code == 0:
            self.containers_completed += 1
        elif not timed_out:
            self.containers_failed += 1

        return DockerExecutionResult(
            exit_code=exit_code,
            stdout=stdout_str,
            stderr=stderr_str,
            duration_ms=duration_ms,
            timed_out=timed_out,
            oom_killed=oom_killed,
            output_truncated=output_truncated,
        )

    def get_telemetry(self) -> Dict[str, Any]:
        """Returns safe operational container telemetry."""
        return {
            "docker_available": self.is_available(),
            "containers_started": self.containers_started,
            "containers_completed": self.containers_completed,
            "containers_failed": self.containers_failed,
            "containers_timed_out": self.containers_timed_out,
            "containers_cleaned": self.containers_cleaned,
            "sandbox_errors": self.sandbox_errors,
        }
