package com.verniq.api.analytics.dto;

public record CompanyAnalyticsDto(
    String slug,
    String name,
    long solved,
    long attempted,
    long total,
    double solveRate
) {}
