package com.verniq.api.submissions.queue;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;
import java.time.Instant;

/**
 * Production Message Contract published to the Redis submission queue.
 *
 * <p>Strictly conforms to Phase J.5.1 JudgeJob specification (contractVersion = "1").
 * Guarantees zero leakage of canonical test cases, secrets, or privileged execution flags.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record JudgeJobPayload(
    @JsonProperty("contractVersion")
    String contractVersion,

    @JsonProperty("jobId")
    String jobId,

    @JsonProperty("submissionId")
    String submissionId,

    @JsonProperty("problemId")
    String problemId,

    @JsonProperty("problemVerniqId")
    String problemVerniqId,

    @JsonProperty("problemVersion")
    Integer problemVersion,

    @JsonProperty("language")
    String language,

    @JsonProperty("sourceCode")
    String sourceCode,

    @JsonProperty("mode")
    String mode,

    @JsonProperty("timeLimitMs")
    Integer timeLimitMs,

    @JsonProperty("memoryLimitMb")
    Integer memoryLimitMb,

    @JsonProperty("customInput")
    String customInput,

    @JsonProperty("createdAt")
    String createdAt
) implements Serializable {

    public static final String CONTRACT_VERSION = "1";

    public static JudgeJobPayload of(
            String jobId,
            String submissionId,
            String problemId,
            String problemVerniqId,
            Integer problemVersion,
            String language,
            String sourceCode,
            String mode,
            Integer timeLimitMs,
            Integer memoryLimitMb,
            String customInput
    ) {
        String effectiveMode = (mode != null && !mode.isBlank()) ? mode.toUpperCase().trim() : "SUBMIT";
        return new JudgeJobPayload(
            CONTRACT_VERSION,
            jobId,
            submissionId,
            problemId,
            problemVerniqId,
            problemVersion,
            language,
            sourceCode,
            effectiveMode,
            timeLimitMs != null ? timeLimitMs : 2000,
            memoryLimitMb != null ? memoryLimitMb : 256,
            customInput,
            Instant.now().toString()
        );
    }

    /**
     * Backwards-compatible factory overload defaulting to SUBMIT mode.
     */
    public static JudgeJobPayload of(
            String jobId,
            String submissionId,
            String problemId,
            String problemVerniqId,
            int problemVersion,
            String language,
            String sourceCode,
            int timeLimitMs,
            int memoryLimitMb
    ) {
        return of(
            jobId,
            submissionId,
            problemId,
            problemVerniqId,
            problemVersion,
            language,
            sourceCode,
            "SUBMIT",
            timeLimitMs,
            memoryLimitMb,
            null
        );
    }

    @Override
    public String toString() {
        return "JudgeJobPayload[" +
            "contractVersion='" + contractVersion + '\'' +
            ", jobId='" + jobId + '\'' +
            ", submissionId='" + submissionId + '\'' +
            ", problemId='" + problemId + '\'' +
            ", problemVerniqId='" + problemVerniqId + '\'' +
            ", problemVersion=" + problemVersion +
            ", language='" + language + '\'' +
            ", sourceCode='<REDACTED len=" + (sourceCode != null ? sourceCode.length() : 0) + ">'" +
            ", mode='" + mode + '\'' +
            ", timeLimitMs=" + timeLimitMs +
            ", memoryLimitMb=" + memoryLimitMb +
            ", customInput=" + (customInput != null ? "'<SET len=" + customInput.length() + ">'" : "null") +
            ", createdAt='" + createdAt + '\'' +
            ']';
    }
}
