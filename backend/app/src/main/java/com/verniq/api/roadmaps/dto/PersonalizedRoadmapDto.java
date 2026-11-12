package com.verniq.api.roadmaps.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

public record PersonalizedRoadmapDto(
        UUID id,
        UUID userId,
        String title,
        String goal,
        LocalDate targetDate,
        Integer dailyMinutes,
        Boolean isActive,
        Integer version,
        Instant createdAt,
        Instant updatedAt,
        Map<String, Object> planData
) {}
