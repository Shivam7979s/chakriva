package com.verniq.api.analytics.dto;

import com.verniq.api.progress.dto.RecentActivityDto;
import java.util.List;

/**
 * Server-authoritative composite response for product intelligence and learning analytics.
 */
public record AnalyticsOverviewDto(
    CodingStatsDto coding,
    DifficultyAnalyticsDto difficulty,
    List<TopicAnalyticsDto> topics,
    List<CompanyAnalyticsDto> companies,
    LearningVelocityDto velocity,
    List<TrendPointDto> trends,
    List<DeterministicInsightDto> insights,
    List<RecentActivityDto> recentActivity
) {}
