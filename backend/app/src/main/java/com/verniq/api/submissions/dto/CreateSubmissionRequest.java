package com.verniq.api.submissions.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Public payload submitted by authenticated client to request judge evaluation.
 * Supports both canonical SUBMIT and interactive RUN modes.
 */
public record CreateSubmissionRequest(
    @NotBlank(message = "Problem identifier cannot be blank")
    String problemId,

    @NotBlank(message = "Programming language cannot be blank")
    String language,

    @NotBlank(message = "Source code cannot be blank")
    @Size(max = 262144, message = "Source code cannot exceed 256KB")
    String sourceCode,

    String mode,

    String customInput
) {
    /**
     * Backwards-compatible convenience constructor defaulting mode to SUBMIT.
     */
    public CreateSubmissionRequest(String problemId, String language, String sourceCode) {
        this(problemId, language, sourceCode, "SUBMIT", null);
    }
}
