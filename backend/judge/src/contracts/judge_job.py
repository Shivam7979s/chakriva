"""Production Judge Job Contract (Version 1).

Defines the canonical, versioned job schema consumed by the isolated judge worker.
Adheres strictly to zero-trust principles:
  - Application plane is authoritative for problem identity, limits, and mode.
  - Contract contains ZERO secrets, hidden tests, or host environment details.
  - Source code is strictly redacted in string/repr representations.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Set
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

CONTRACT_VERSION = "1"

SUPPORTED_LANGUAGES: Set[str] = {
    "cpp", "c++",
    "java",
    "python", "py", "python3",
    "typescript", "ts",
    "go",
    "rust"
}

NORMALIZED_LANGUAGE_MAP = {
    "c++": "cpp",
    "py": "python",
    "python3": "python",
    "ts": "typescript",
}


class JobMode(str, Enum):
    """Execution mode distinguishing sandbox sample runs from canonical submissions."""
    RUN = "RUN"
    SUBMIT = "SUBMIT"


class JudgeJob(BaseModel):
    """Canonical versioned Judge Job specification.

    Minimum trusted information required by the execution worker.
    The worker only executes the validated job and does not trust client parameters.
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
        description="Unique execution job identifier. Acts as idempotency key for transport layer."
    )
    submissionId: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Chakriva submission entity identifier."
    )
    problemId: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=128,
        description="Internal problem UUID or database identifier. Required for SUBMIT mode."
    )
    problemVerniqId: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=32,
        description="Permanent public problem identifier (e.g. VRQ-000001). Optional for standalone runs."
    )
    problemVersion: Optional[int] = Field(
        default=None,
        ge=1,
        description="Immutable problem version identifier at submission creation time."
    )
    language: str = Field(
        ...,
        min_length=1,
        max_length=32,
        description="Target programming language (e.g. cpp, java, python, typescript, go, rust)."
    )
    sourceCode: str = Field(
        ...,
        min_length=1,
        max_length=262144,
        description="User's submitted untrusted source code (max 256KB). Never logged."
    )
    mode: JobMode = Field(
        default=JobMode.SUBMIT,
        description="Execution mode: RUN (sample/custom test) or SUBMIT (authoritative canonical suite)."
    )
    timeLimitMs: int = Field(
        default=2000,
        ge=100,
        le=15000,
        description="Server-authoritative execution time limit in milliseconds."
    )
    memoryLimitMb: int = Field(
        default=256,
        ge=16,
        le=1024,
        description="Server-authoritative memory limit in megabytes."
    )
    customInput: Optional[str] = Field(
        default=None,
        max_length=65536,
        description="Explicit user-provided input for RUN mode. Must be None or ignored in SUBMIT mode."
    )
    createdAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp when the job was originated."
    )

    @field_validator("contractVersion")
    @classmethod
    def validate_contract_version(cls, v: str) -> str:
        if v != CONTRACT_VERSION:
            raise ValueError(f"Unsupported contractVersion '{v}'. Expected '{CONTRACT_VERSION}'.")
        return v

    @field_validator("language")
    @classmethod
    def validate_and_normalize_language(cls, v: str) -> str:
        cleaned = v.lower().strip()
        if cleaned not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported language '{v}'. Supported languages: {sorted(list(SUPPORTED_LANGUAGES))}"
            )
        return NORMALIZED_LANGUAGE_MAP.get(cleaned, cleaned)

    @field_validator("mode", mode="before")
    @classmethod
    def parse_mode(cls, v) -> JobMode:
        if isinstance(v, str):
            try:
                return JobMode(v.upper().strip())
            except ValueError:
                raise ValueError(f"Invalid mode '{v}'. Must be 'RUN' or 'SUBMIT'.")
        return v

    @model_validator(mode="after")
    def validate_mode_requirements(self) -> "JudgeJob":
        if self.mode == JobMode.SUBMIT:
            if not self.problemId or not self.problemId.strip():
                raise ValueError("problemId is required for SUBMIT mode jobs.")
        return self

    def __repr__(self) -> str:
        """Sanitized representation to guarantee user source code is never leaked into logs."""
        return (
            f"JudgeJob(contractVersion={self.contractVersion!r}, jobId={self.jobId!r}, "
            f"submissionId={self.submissionId!r}, problemId={self.problemId!r}, "
            f"problemVerniqId={self.problemVerniqId!r}, problemVersion={self.problemVersion!r}, "
            f"language={self.language!r}, sourceCode='<REDACTED len={len(self.sourceCode)}>', "
            f"mode={self.mode.value!r}, timeLimitMs={self.timeLimitMs}, memoryLimitMb={self.memoryLimitMb})"
        )

    def __str__(self) -> str:
        return self.__repr__()
