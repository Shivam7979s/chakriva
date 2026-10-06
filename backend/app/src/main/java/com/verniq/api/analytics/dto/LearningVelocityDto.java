package com.verniq.api.analytics.dto;

public record LearningVelocityDto(
    long problemsSolvedLast7Days,
    long problemsSolvedLast30Days,
    long submissionsLast7Days,
    RoadmapVelocityDto activeRoadmap
) {}
