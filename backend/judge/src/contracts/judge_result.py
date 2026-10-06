"""Production Judge Result Contract (Version 1).

Defines the canonical, versioned result schema reported by the AWS Judge Worker
back to the Chakriva Application Plane.
Distinguishes transport/worker execution status from algorithmic problem verdicts.
Guarantees hidden-test security and unifies granular execution telemetry.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .judge_job import CONTRACT_VERSION


class JudgeJobStatus(str, Enum):
    """Transport and execution lifecycle status."""
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class JudgeVerdict(str, Enum):
    """Algorithmic evaluation verdict for the candidate's code."""
    ACCEPTED = "ACCEPTED"
    WRONG_ANSWER = "WRONG_ANSWER"
    TIME_LIMIT_EXCEEDED = "TIME_LIMIT_EXCEEDED"
    MEMORY_LIMIT_EXCEEDED = "MEMORY_LIMIT_EXCEEDED"
    COMPILATION_ERROR = "COMPILATION_ERROR"
    RUNTIME_ERROR = "RUNTIME_ERROR"
    CANCELLED = "CANCELLED"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class FirstFailedTest(BaseModel):
    """Safe diagnostic information for the first non-passing test case.

    SECURITY RULE:
    Hidden test inputs and expected outputs must NEVER be populated when isSample is False.
    Only publicly visible sample tests may provide full input/output diffs.
    """
    model_config = ConfigDict(
        extra="forbid",
    )

    testNumber: int = Field(
        ...,
        ge=1,
        description="1-based sequence index of the failed test case."
    )
    actualOutput: Optional[str] = Field(
        default=None,
        max_length=16384,
        description="Truncated user program output for comparison."
    )
    expectedOutput: Optional[str] = Field(
        default=None,
        max_length=16384,
        description="Expected output. Strictly populated ONLY for public sample tests."
    )
    failureType: Optional[str] = Field(
        default=None,
        max_length=64,
        description="Category of failure (e.g. WRONG_ANSWER, TIME_LIMIT_EXCEEDED, RUNTIME_EXCEPTION)."
    )
    errorMessage: Optional[str] = Field(
        default=None,
        max_length=16384,
        description="Safe diagnostic message or exception description."
    )
    isSample: bool = Field(
        default=False,
        description="Flag indicating if the test was a public sample test or canonical hidden test."
    )


class JobTelemetry(BaseModel):
    """Granular operational and execution timing telemetry."""
    model_config = ConfigDict(
        extra="forbid",
    )

    executionId: Optional[str] = None
    requestReceivedAt: Optional[str] = None
    jobQueuedAt: Optional[str] = None
    workerAcquiredAt: Optional[str] = None
    sandboxCreatedAt: Optional[str] = None
    compileStartedAt: Optional[str] = None
    compileFinishedAt: Optional[str] = None
    executionStartedAt: Optional[str] = None
    executionFinishedAt: Optional[str] = None
    resultCollectedAt: Optional[str] = None
    persistenceFinishedAt: Optional[str] = None
    responseSentAt: Optional[str] = None

    queueMs: int = Field(default=0, ge=0)
    workerAcquisitionMs: int = Field(default=0, ge=0)
    sandboxStartupMs: int = Field(default=0, ge=0)
    compileMs: int = Field(default=0, ge=0)
    executionMs: int = Field(default=0, ge=0)
    resultMs: int = Field(default=0, ge=0)
    persistenceMs: int = Field(default=0, ge=0)
    totalMs: int = Field(default=0, ge=0)
    cachedCompilation: bool = Field(default=False)


class JudgeResult(BaseModel):
    """Canonical versioned Judge Result specification.

    Delivered from AWS Judge Worker to Chakriva Application Plane.
    Separates transport state (status) from evaluation state (verdict).
    """
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
    )

    contractVersion: str = Field(
        default=CONTRACT_VERSION,
        description="Canonical contract version identifier. Always '1'."
    )
    jobId: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Job identifier corresponding to the originating JudgeJob."
    )
    submissionId: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Chakriva submission entity identifier."
    )
    workerId: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Identifier of the executing worker instance (e.g. aws-judge-worker-ap-south-1a)."
    )
    status: JudgeJobStatus = Field(
        ...,
        description="Execution lifecycle status: COMPLETED, FAILED, or INTERNAL_ERROR."
    )
    verdict: JudgeVerdict = Field(
        ...,
        description="Algorithmic verdict: ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, etc."
    )
    runtimeMs: int = Field(
        default=0,
        ge=0,
        description="Total user program execution runtime in milliseconds."
    )
    memoryKb: int = Field(
        default=0,
        ge=0,
        description="Peak resident memory utilization in kilobytes."
    )
    testCasesPassed: int = Field(
        default=0,
        ge=0,
        description="Count of test cases successfully passed."
    )
    totalTestCases: int = Field(
        default=0,
        ge=0,
        description="Total count of evaluated test cases."
    )
    firstFailedTest: Optional[FirstFailedTest] = Field(
        default=None,
        description="Detailed failure diagnostic for first non-passing test."
    )
    compileOutput: Optional[str] = Field(
        default=None,
        max_length=65536,
        description="Compiler error output (sanitized to remove host paths)."
    )
    stderrOutput: Optional[str] = Field(
        default=None,
        max_length=65536,
        description="Runtime standard error."
    )
    stdoutOutput: Optional[str] = Field(
        default=None,
        max_length=65536,
        description="Standard output of execution (sample runs only)."
    )
    telemetry: Optional[JobTelemetry] = Field(
        default=None,
        description="Performance tracing telemetry for the execution cycle."
    )
    completedAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp when execution and validation completed."
    )

    @field_validator("contractVersion")
    @classmethod
    def validate_contract_version(cls, v: str) -> str:
        if v != CONTRACT_VERSION:
            raise ValueError(f"Unsupported contractVersion '{v}'. Expected '{CONTRACT_VERSION}'.")
        return v

    @field_validator("status", mode="before")
    @classmethod
    def parse_status(cls, v: Any) -> JudgeJobStatus:
        if isinstance(v, str):
            try:
                return JudgeJobStatus(v.upper().strip())
            except ValueError:
                raise ValueError(
                    f"Invalid status '{v}'. Allowed: {[s.value for s in JudgeJobStatus]}"
                )
        return v

    @field_validator("verdict", mode="before")
    @classmethod
    def parse_verdict(cls, v: Any) -> JudgeVerdict:
        if isinstance(v, str):
            try:
                return JudgeVerdict(v.upper().strip())
            except ValueError:
                raise ValueError(
                    f"Invalid verdict '{v}'. Allowed: {[v.value for v in JudgeVerdict]}"
                )
        return v

    @classmethod
    def from_execution_result(
        cls,
        job_id: str,
        submission_id: str,
        worker_id: str,
        exec_res: Any,
    ) -> "JudgeResult":
        """Maps internal ExecutionResult into the versioned production JudgeResult contract.

        Maintains clean layer separation: internal execution models are decoupled
        from external transport contracts.
        """
        # Determine status based on verdict
        raw_verdict_str = getattr(exec_res, "verdict", "internal_error").upper()
        if raw_verdict_str in ("INTERNAL_ERROR", "SYSTEM_ERROR"):
            status = JudgeJobStatus.INTERNAL_ERROR
            verdict = JudgeVerdict.INTERNAL_ERROR
        elif raw_verdict_str in ("CANCELLED", "TIMEOUT"):
            status = JudgeJobStatus.FAILED
            verdict = (
                JudgeVerdict.TIME_LIMIT_EXCEEDED
                if raw_verdict_str == "TIMEOUT"
                else JudgeVerdict.CANCELLED
            )
        else:
            status = JudgeJobStatus.COMPLETED
            try:
                verdict = JudgeVerdict(raw_verdict_str)
            except ValueError:
                verdict = JudgeVerdict.INTERNAL_ERROR
                status = JudgeJobStatus.INTERNAL_ERROR

        # First failed test conversion with anti-leak protection
        first_failed: Optional[FirstFailedTest] = None
        raw_failed = getattr(exec_res, "first_failed_test", None) or getattr(exec_res, "firstFailedTest", None)
        if raw_failed:
            t_num = getattr(raw_failed, "test_number", None) or getattr(raw_failed, "testNumber", 1)
            is_sample = bool(
                getattr(raw_failed, "is_sample", None)
                if getattr(raw_failed, "is_sample", None) is not None
                else getattr(raw_failed, "isSample", False)
            )

            # SECURITY: Do not expose expected output for canonical hidden tests
            expected_out = (
                getattr(raw_failed, "expected_output", None) or getattr(raw_failed, "expectedOutput", None)
            ) if is_sample else None

            first_failed = FirstFailedTest(
                testNumber=t_num,
                actualOutput=getattr(raw_failed, "actual_output", None) or getattr(raw_failed, "actualOutput", None),
                expectedOutput=expected_out,
                failureType=getattr(raw_failed, "failure_type", None) or getattr(raw_failed, "failureType", verdict.value),
                errorMessage=getattr(raw_failed, "error_message", None) or getattr(raw_failed, "errorMessage", None),
                isSample=is_sample,
            )

        # Telemetry conversion
        job_telemetry: Optional[JobTelemetry] = None
        raw_telem = getattr(exec_res, "telemetry", None)
        if raw_telem:
            job_telemetry = JobTelemetry(
                executionId=getattr(raw_telem, "execution_id", None),
                requestReceivedAt=getattr(raw_telem, "request_received_at", None),
                jobQueuedAt=getattr(raw_telem, "job_queued_at", None),
                workerAcquiredAt=getattr(raw_telem, "worker_acquired_at", None),
                sandboxCreatedAt=getattr(raw_telem, "sandbox_created_at", None),
                compileStartedAt=getattr(raw_telem, "compile_started_at", None),
                compileFinishedAt=getattr(raw_telem, "compile_finished_at", None),
                executionStartedAt=getattr(raw_telem, "execution_started_at", None),
                executionFinishedAt=getattr(raw_telem, "execution_finished_at", None),
                resultCollectedAt=getattr(raw_telem, "result_collected_at", None),
                persistenceFinishedAt=getattr(raw_telem, "persistence_finished_at", None),
                responseSentAt=getattr(raw_telem, "response_sent_at", None),
                queueMs=getattr(raw_telem, "queue_ms", 0),
                workerAcquisitionMs=getattr(raw_telem, "worker_acquisition_ms", 0),
                sandboxStartupMs=getattr(raw_telem, "sandbox_startup_ms", 0),
                compileMs=getattr(raw_telem, "compile_ms", 0),
                executionMs=getattr(raw_telem, "execution_ms", 0),
                resultMs=getattr(raw_telem, "result_ms", 0),
                persistenceMs=getattr(raw_telem, "persistence_ms", 0),
                totalMs=getattr(raw_telem, "total_ms", 0),
                cachedCompilation=getattr(raw_telem, "cached_compilation", False),
            )

        return cls(
            contractVersion=CONTRACT_VERSION,
            jobId=job_id,
            submissionId=submission_id,
            workerId=worker_id,
            status=status,
            verdict=verdict,
            runtimeMs=getattr(exec_res, "runtime_ms", 0),
            memoryKb=getattr(exec_res, "memory_kb", 0),
            testCasesPassed=getattr(exec_res, "test_cases_passed", 0),
            totalTestCases=getattr(exec_res, "total_test_cases", 0),
            firstFailedTest=first_failed,
            compileOutput=getattr(exec_res, "compile_output", None),
            stderrOutput=getattr(exec_res, "stderr_output", None),
            stdoutOutput=getattr(exec_res, "stdout_output", None),
            telemetry=job_telemetry,
        )
