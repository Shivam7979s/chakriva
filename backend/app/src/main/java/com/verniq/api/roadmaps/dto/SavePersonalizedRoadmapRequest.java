package com.verniq.api.roadmaps.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.Map;

public record SavePersonalizedRoadmapRequest(
        String title,
        String goal,
        LocalDate targetDate,
        Integer dailyMinutes,
        Integer version,
        @NotNull(message = "planData must not be null")
        Map<String, Object> planData
) {}
