package com.verniq.api.submissions.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Diagnostic payload for the first non-passing test case from JudgeResult.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record FirstFailedTestDto(
    @JsonProperty("testNumber")
    Integer testNumber,

    @JsonProperty("actualOutput")
    String actualOutput,

    @JsonProperty("expectedOutput")
    String expectedOutput,

    @JsonProperty("failureType")
    String failureType,

    @JsonProperty("errorMessage")
    String errorMessage,

    @JsonProperty("isSample")
    Boolean isSample
) {}
