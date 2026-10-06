"""Unit tests for Phase J.5.1 Production Judge Job and Result Contracts.

Validates:
  - Valid SUBMIT job creation and constraints
  - Valid RUN job creation
  - Missing required fields (jobId, submissionId) rejection
  - Invalid mode rejection
  - Invalid language rejection
  - Boundary execution limits validation
  - Contract version enforcement (only '1' permitted)
  - Result status vs. verdict separation
  - First-failed-test anti-leak security (no hidden output exposure)
  - Telemetry structure integrity
  - Full JSON serialization / deserialization roundtrip
  - Strict rejection of extra unsafe/injected fields (ConfigDict extra='forbid')
  - Source code redaction in string representations
  - Decoupled mapping from internal ExecutionResult
"""
import json
import os
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from pydantic import ValidationError

# Ensure backend/judge directory is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.contracts import (
    CONTRACT_VERSION,
    FirstFailedTest,
    JobMode,
    JobTelemetry,
    JudgeJob,
    JudgeJobStatus,
    JudgeResult,
    JudgeVerdict,
)
from src.runner.sandbox import ExecutionResult, FailedTestCaseInfo, ExecutionTelemetry


class TestJudgeJobContract(unittest.TestCase):
    """Test suite for JudgeJob contract schema and validation."""

    def test_01_valid_submit_job(self):
        job = JudgeJob(
            jobId="job-uuid-12345",
            submissionId="sub-uuid-67890",
            problemId="prob-uuid-abcdef",
            problemVerniqId="VRQ-000001",
            problemVersion=1,
            language="java",
            sourceCode="class Solution { public int solve() { return 42; } }",
            mode=JobMode.SUBMIT,
            timeLimitMs=2000,
            memoryLimitMb=256,
        )
        self.assertEqual(job.contractVersion, "1")
        self.assertEqual(job.jobId, "job-uuid-12345")
        self.assertEqual(job.submissionId, "sub-uuid-67890")
        self.assertEqual(job.problemId, "prob-uuid-abcdef")
        self.assertEqual(job.language, "java")
        self.assertEqual(job.mode, JobMode.SUBMIT)
        self.assertEqual(job.timeLimitMs, 2000)
        self.assertEqual(job.memoryLimitMb, 256)

    def test_02_valid_run_job_with_custom_input(self):
        job = JudgeJob(
            jobId="job-run-001",
            submissionId="sub-run-001",
            language="python3",
            sourceCode="print('hello')",
            mode="RUN",
            customInput="sample input text\n",
        )
        self.assertEqual(job.mode, JobMode.RUN)
        self.assertEqual(job.language, "python")  # Normalized from python3
        self.assertIsNone(job.problemId)  # problemId optional for RUN
        self.assertEqual(job.customInput, "sample input text\n")

    def test_03_missing_job_id_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            JudgeJob(
                submissionId="sub-123",
                problemId="prob-123",
                language="python",
                sourceCode="pass",
            )
        self.assertIn("jobId", str(ctx.exception))

    def test_04_missing_submission_id_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            JudgeJob(
                jobId="job-123",
                problemId="prob-123",
                language="python",
                sourceCode="pass",
            )
        self.assertIn("submissionId", str(ctx.exception))

    def test_05_invalid_mode_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            JudgeJob(
                jobId="job-123",
                submissionId="sub-123",
                problemId="prob-123",
                language="python",
                sourceCode="pass",
                mode="BENCHMARK",  # Invalid mode
            )
        self.assertIn("Invalid mode", str(ctx.exception))

    def test_06_invalid_language_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            JudgeJob(
                jobId="job-123",
                submissionId="sub-123",
                problemId="prob-123",
                language="brainfuck",  # Unsupported language
                sourceCode="++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.",
            )
        self.assertIn("Unsupported language", str(ctx.exception))

    def test_07_invalid_execution_limits_rejected(self):
        # Time limit below minimum
        with self.assertRaises(ValidationError):
            JudgeJob(
                jobId="job-1", submissionId="sub-1", problemId="prob-1",
                language="cpp", sourceCode="int main(){}", timeLimitMs=50
            )

        # Time limit exceeding maximum
        with self.assertRaises(ValidationError):
            JudgeJob(
                jobId="job-1", submissionId="sub-1", problemId="prob-1",
                language="cpp", sourceCode="int main(){}", timeLimitMs=20000
            )

        # Memory limit below minimum
        with self.assertRaises(ValidationError):
            JudgeJob(
                jobId="job-1", submissionId="sub-1", problemId="prob-1",
                language="cpp", sourceCode="int main(){}", memoryLimitMb=8
            )

        # Memory limit exceeding maximum
        with self.assertRaises(ValidationError):
            JudgeJob(
                jobId="job-1", submissionId="sub-1", problemId="prob-1",
                language="cpp", sourceCode="int main(){}", memoryLimitMb=2048
            )

    def test_08_contract_version_validation(self):
        with self.assertRaises(ValidationError) as ctx:
            JudgeJob(
                contractVersion="2",  # Unsupported version
                jobId="job-1",
                submissionId="sub-1",
                problemId="prob-1",
                language="python",
                sourceCode="pass",
            )
        self.assertIn("Unsupported contractVersion", str(ctx.exception))

    def test_09_submit_mode_requires_problem_id(self):
        with self.assertRaises(ValidationError) as ctx:
            JudgeJob(
                jobId="job-1",
                submissionId="sub-1",
                problemId=None,
                language="python",
                sourceCode="pass",
                mode=JobMode.SUBMIT,
            )
        self.assertIn("problemId is required for SUBMIT mode jobs", str(ctx.exception))

    def test_10_extra_unsafe_fields_strictly_forbidden(self):
        with self.assertRaises(ValidationError) as ctx:
            JudgeJob(
                jobId="job-1",
                submissionId="sub-1",
                problemId="prob-1",
                language="python",
                sourceCode="pass",
                dockerArgs="--privileged -v /:/host",  # Dangerous injection
            )
        self.assertIn("extra_forbidden", str(ctx.exception).lower())

    def test_11_source_code_redacted_in_repr(self):
        job = JudgeJob(
            jobId="job-1",
            submissionId="sub-1",
            problemId="prob-1",
            language="python",
            sourceCode="SECRET_PROPRIETARY_ALGORITHM = 12345",
        )
        repr_str = repr(job)
        str_str = str(job)
        self.assertNotIn("SECRET_PROPRIETARY_ALGORITHM", repr_str)
        self.assertNotIn("SECRET_PROPRIETARY_ALGORITHM", str_str)
        self.assertIn("<REDACTED len=", repr_str)

    def test_12_serialization_deserialization_roundtrip(self):
        orig_job = JudgeJob(
            jobId="job-roundtrip-999",
            submissionId="sub-roundtrip-999",
            problemId="prob-roundtrip-999",
            problemVerniqId="VRQ-000002",
            problemVersion=2,
            language="typescript",
            sourceCode="export function solve(): number { return 1; }",
            mode=JobMode.SUBMIT,
            timeLimitMs=1500,
            memoryLimitMb=128,
        )
        json_data = orig_job.model_dump_json()
        reconstituted = JudgeJob.model_validate_json(json_data)
        self.assertEqual(reconstituted.jobId, orig_job.jobId)
        self.assertEqual(reconstituted.language, "typescript")
        self.assertEqual(reconstituted.mode, JobMode.SUBMIT)
        self.assertEqual(reconstituted.timeLimitMs, 1500)
        self.assertEqual(reconstituted.sourceCode, orig_job.sourceCode)


class TestJudgeResultContract(unittest.TestCase):
    """Test suite for JudgeResult contract schema, telemetry, and anti-leak rules."""

    def test_13_valid_accepted_result(self):
        res = JudgeResult(
            jobId="job-123",
            submissionId="sub-123",
            workerId="aws-worker-01",
            status=JudgeJobStatus.COMPLETED,
            verdict=JudgeVerdict.ACCEPTED,
            runtimeMs=45,
            memoryKb=18432,
            testCasesPassed=10,
            totalTestCases=10,
        )
        self.assertEqual(res.contractVersion, "1")
        self.assertEqual(res.status, JudgeJobStatus.COMPLETED)
        self.assertEqual(res.verdict, JudgeVerdict.ACCEPTED)
        self.assertEqual(res.testCasesPassed, 10)
        self.assertIsNone(res.firstFailedTest)

    def test_14_status_verdict_separation(self):
        # Execution failed during compilation: status is COMPLETED, verdict is COMPILATION_ERROR
        res = JudgeResult(
            jobId="job-ce-1",
            submissionId="sub-ce-1",
            workerId="aws-worker-01",
            status="COMPLETED",
            verdict="COMPILATION_ERROR",
            compileOutput="Solution.java:5: error: ';' expected",
        )
        self.assertEqual(res.status, JudgeJobStatus.COMPLETED)
        self.assertEqual(res.verdict, JudgeVerdict.COMPILATION_ERROR)
        self.assertIn("error: ';'", res.compileOutput)

        # Worker infrastructure failure: status is INTERNAL_ERROR, verdict is INTERNAL_ERROR
        err_res = JudgeResult(
            jobId="job-err-1",
            submissionId="sub-err-1",
            workerId="aws-worker-01",
            status="INTERNAL_ERROR",
            verdict="INTERNAL_ERROR",
            stderrOutput="Sandbox container launch timeout",
        )
        self.assertEqual(err_res.status, JudgeJobStatus.INTERNAL_ERROR)
        self.assertEqual(err_res.verdict, JudgeVerdict.INTERNAL_ERROR)

    def test_15_first_failed_test_anti_leak_rule(self):
        # Sample test may contain expected output
        sample_fail = FirstFailedTest(
            testNumber=1,
            actualOutput="[0, 0]",
            expectedOutput="[0, 1]",
            failureType="WRONG_ANSWER",
            isSample=True,
        )
        self.assertEqual(sample_fail.expectedOutput, "[0, 1]")
        self.assertTrue(sample_fail.isSample)

        # Hidden test must have expected output suppressed
        hidden_fail = FirstFailedTest(
            testNumber=4,
            actualOutput="null",
            expectedOutput=None,  # Anti-leak guarantee
            failureType="WRONG_ANSWER",
            isSample=False,
        )
        self.assertIsNone(hidden_fail.expectedOutput)
        self.assertFalse(hidden_fail.isSample)

    def test_16_extra_unsafe_fields_forbidden_in_result(self):
        with self.assertRaises(ValidationError) as ctx:
            JudgeResult(
                jobId="job-1",
                submissionId="sub-1",
                workerId="w-1",
                status="COMPLETED",
                verdict="ACCEPTED",
                supabaseSecretKey="leak-test",  # Forbidden secret injection
            )
        self.assertIn("extra_forbidden", str(ctx.exception).lower())

    def test_17_telemetry_model_validation(self):
        telemetry = JobTelemetry(
            executionId="exec-789",
            queueMs=15,
            workerAcquisitionMs=5,
            sandboxStartupMs=25,
            compileMs=120,
            executionMs=45,
            totalMs=210,
            cachedCompilation=True,
        )
        self.assertEqual(telemetry.totalMs, 210)
        self.assertTrue(telemetry.cachedCompilation)

        # Negative times rejected
        with self.assertRaises(ValidationError):
            JobTelemetry(totalMs=-5)

    def test_18_mapping_from_execution_result(self):
        # Mock internal ExecutionResult
        raw_failed = FailedTestCaseInfo(
            test_number=3,
            actual_output="42",
            expected_output="SECRET_CANONICAL_OUTPUT",  # Raw internal expected output
            failure_type="WRONG_ANSWER",
            is_sample=False,  # Hidden test!
        )
        raw_telemetry = ExecutionTelemetry(
            execution_id="exec-mapping-1",
            request_received_at="2026-10-06T00:00:00Z",
            compile_ms=100,
            execution_ms=30,
            total_ms=130,
            cached_compilation=False,
        )
        exec_res = ExecutionResult(
            verdict="wrong_answer",
            runtime_ms=30,
            memory_kb=15000,
            test_cases_passed=2,
            total_test_cases=5,
            first_failed_test=raw_failed,
            telemetry=raw_telemetry,
        )

        mapped_result = JudgeResult.from_execution_result(
            job_id="job-map-001",
            submission_id="sub-map-001",
            worker_id="aws-worker-m1",
            exec_res=exec_res,
        )

        self.assertEqual(mapped_result.status, JudgeJobStatus.COMPLETED)
        self.assertEqual(mapped_result.verdict, JudgeVerdict.WRONG_ANSWER)
        self.assertEqual(mapped_result.testCasesPassed, 2)
        self.assertEqual(mapped_result.totalTestCases, 5)

        # ANTI-LEAK CHECK: Hidden test's expected output must be suppressed by mapper
        self.assertIsNotNone(mapped_result.firstFailedTest)
        self.assertEqual(mapped_result.firstFailedTest.testNumber, 3)
        self.assertIsNone(mapped_result.firstFailedTest.expectedOutput)

        # Telemetry check
        self.assertIsNotNone(mapped_result.telemetry)
        self.assertEqual(mapped_result.telemetry.totalMs, 130)

    def test_19_result_json_roundtrip(self):
        res = JudgeResult(
            jobId="job-roundtrip-res",
            submissionId="sub-roundtrip-res",
            workerId="aws-worker-01",
            status=JudgeJobStatus.COMPLETED,
            verdict=JudgeVerdict.ACCEPTED,
            runtimeMs=35,
            memoryKb=12000,
            testCasesPassed=8,
            totalTestCases=8,
        )
        json_str = res.model_dump_json()
        restored = JudgeResult.model_validate_json(json_str)
        self.assertEqual(restored.jobId, res.jobId)
        self.assertEqual(restored.verdict, JudgeVerdict.ACCEPTED)
        self.assertEqual(restored.status, JudgeJobStatus.COMPLETED)


if __name__ == "__main__":
    unittest.main()
