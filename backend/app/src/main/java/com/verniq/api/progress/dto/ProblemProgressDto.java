package com.verniq.api.progress.dto;

import java.time.Instant;
import java.util.UUID;

public record ProblemProgressDto(
    UUID problemId,
    String verniqId,
    String title,
    String status,
    int attemptCount,
    Instant firstAttemptedAt,
    Instant lastAttemptedAt,
    Instant firstSolvedAt,
    Instant lastSolvedAt,
    UUID acceptedSubmissionId
) {}
