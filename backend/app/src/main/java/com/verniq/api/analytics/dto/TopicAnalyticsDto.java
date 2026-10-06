package com.verniq.api.analytics.dto;

public record TopicAnalyticsDto(
    String slug,
    String name,
    long solved,
    long attempted,
    long total,
    double solveRate,
    String assessment
) {}
