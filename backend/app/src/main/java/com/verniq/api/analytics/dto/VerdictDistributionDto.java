package com.verniq.api.analytics.dto;

/**
 * Breakdown of user submissions across all supported verdict types.
 */
public record VerdictDistributionDto(
    long accepted,
    long wrongAnswer,
    long compilationError,
    long runtimeError,
    long timeLimitExceeded,
    long memoryLimitExceeded,
    long internalError,
    long total
) {}
