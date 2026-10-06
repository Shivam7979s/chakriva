package com.verniq.api.analytics.dto;

import java.util.Map;

/**
 * High-level coding overview metrics and submission verdict distribution.
 */
public record CodingStatsDto(
    long problemsSolved,
    long problemsAttempted,
    double problemSolveRate,
    long totalSubmissions,
    long acceptedSubmissions,
    double submissionAcceptanceRate,
    VerdictDistributionDto verdictDistribution
) {}
