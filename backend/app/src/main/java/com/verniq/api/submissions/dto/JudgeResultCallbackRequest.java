package com.verniq.api.submissions.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;

/**
 * Service-to-service callback payload delivered by the Python judge worker upon completion.
 * Fully compatible with the canonical J.5.1 JudgeResult contract.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record JudgeResultCallbackRequest(
    @JsonProperty("contractVersion")
    String contractVersion,

    @JsonProperty("jobId")
    @NotBlank(message = "Job ID cannot be blank")
    String jobId,

    @JsonProperty("submissionId")
    @NotNull(message = "Submission ID cannot be null")
    UUID submissionId,

    @JsonProperty("workerId")
    String workerId,

    @JsonProperty("status")
    String status,

    @JsonProperty("verdict")
    @NotBlank(message = "Verdict cannot be blank")
    String verdict,

    @JsonProperty("runtimeMs")
    Integer runtimeMs,

    @JsonProperty("memoryKb")
    Integer memoryKb,

    @JsonProperty("testCasesPassed")
    Integer testCasesPassed,

    @JsonProperty("totalTestCases")
    Integer totalTestCases,

    @JsonProperty("firstFailedTest")
    FirstFailedTestDto firstFailedTest,

    @JsonProperty("failedTestIndex")
    Integer failedTestIndex,

    @JsonProperty("compileOutput")
    String compileOutput,

    @JsonProperty("stderrOutput")
    String stderrOutput,

    @JsonProperty("stdoutOutput")
    String stdoutOutput,

    @JsonProperty("errorMessage")
    String errorMessage,

    @JsonProperty("telemetry")
    Map<String, Object> telemetry,

    @JsonProperty("completedAt")
    String completedAt
) {
    /**
     * Backwards-compatible constructor for existing tests and callers.
     */
    public JudgeResultCallbackRequest(
        int problemVersion,
        String jobId,
        UUID submissionId,
        String verdict,
        Integer runtimeMs,
        Integer memoryKb,
        Integer testCasesPassed,
        Integer totalTestCases,
        Integer failedTestIndex,
        String compileOutput,
        String stderrOutput,
        String stdoutOutput,
        String errorMessage
    ) {
        this(
            "1",
            jobId,
            submissionId,
            null,
            null,
            verdict,
            runtimeMs,
            memoryKb,
            testCasesPassed,
            totalTestCases,
            null,
            failedTestIndex,
            compileOutput,
            stderrOutput,
            stdoutOutput,
            errorMessage,
            null,
            null
        );
    }
}
