"""Chakriva Judge Contracts Package.

Canonical, versioned contracts for job submission and execution result reporting
between the Chakriva Application Plane and the AWS Judge Workers.
"""
from .judge_job import (
    CONTRACT_VERSION,
    JobMode,
    JudgeJob,
    SUPPORTED_LANGUAGES,
)
from .judge_result import (
    FirstFailedTest,
    JobTelemetry,
    JudgeJobStatus,
    JudgeResult,
    JudgeVerdict,
)

__all__ = [
    "CONTRACT_VERSION",
    "JobMode",
    "JudgeJob",
    "SUPPORTED_LANGUAGES",
    "FirstFailedTest",
    "JobTelemetry",
    "JudgeJobStatus",
    "JudgeResult",
    "JudgeVerdict",
]
