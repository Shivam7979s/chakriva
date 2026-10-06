package com.verniq.api.analytics.dto;

public record RoadmapVelocityDto(
    String roadmapId,
    String roadmapTitle,
    String roadmapSlug,
    double progressPercent,
    long completedNodes,
    long totalNodes,
    long completedItems,
    long totalItems,
    String currentSprintTitle,
    Integer currentDayNumber,
    String nextRecommendedVerniqId,
    String nextRecommendedTitle,
    String nextRecommendedDifficulty
) {}
