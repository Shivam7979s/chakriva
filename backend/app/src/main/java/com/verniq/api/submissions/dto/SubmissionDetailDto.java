package com.verniq.api.submissions.dto;

import com.verniq.api.submissions.domain.SubmissionStatus;
import java.time.Instant;
import java.util.UUID;

/**
 * Detailed representation of a submission.
 *
 * <p>CRITICAL SECURITY REQUIREMENT: Hidden canonical test inputs, hidden outputs,
 * reference solutions, and judge internal configurations must NEVER be returned.</p>
 */
public record SubmissionDetailDto(
    UUID id,
    String problemVerniqId,
    String problemTitle,
    String language,
    SubmissionStatus status,
    String verdict,
    Double score,
    Integer runtimeMs,
    Integer memoryKb,
    Integer testCasesPassed,
    Integer totalTestCases,
    Integer failedTestIndex,
    String compileOutput,
    String errorMessage,
    int problemVersion,
    Instant createdAt,
    Instant queuedAt,
    Instant startedAt,
    Instant completedAt
) {}
