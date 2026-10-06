package com.verniq.api.submissions.dto;

import com.verniq.api.submissions.domain.SubmissionStatus;
import java.time.Instant;
import java.util.UUID;

/**
 * Immediate response returned when a submission is successfully created and enqueued.
 */
public record SubmissionResponseDto(
    UUID submissionId,
    String problemId,
    String language,
    SubmissionStatus status,
    Instant queuedAt
) {}
