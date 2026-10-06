package com.verniq.api.analytics.dto;

public record DifficultyAnalyticsDto(
    DifficultyAnalyticsItemDto easy,
    DifficultyAnalyticsItemDto medium,
    DifficultyAnalyticsItemDto hard,
    long totalSolved,
    long totalAttempted,
    long totalCatalog
) {}
