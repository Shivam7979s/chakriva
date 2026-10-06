package com.verniq.api.analytics.dto;

public record DifficultyAnalyticsItemDto(
    long solved,
    long attempted,
    long total,
    double solveRate
) {}
