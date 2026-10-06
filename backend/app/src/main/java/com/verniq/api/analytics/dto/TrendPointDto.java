package com.verniq.api.analytics.dto;

public record TrendPointDto(
    String period,
    String label,
    long solvedCount,
    long submissionCount
) {}
