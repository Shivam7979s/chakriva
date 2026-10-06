package com.verniq.api.progress.dto;

import java.util.List;

public record ProgressSummaryDto(
    long totalProblemsAttempted,
    long totalProblemsSolved,
    long easySolved,
    long mediumSolved,
    long hardSolved,
    long totalSubmissions,
    long acceptedSubmissions,
    double submissionAcceptanceRate,
    DifficultyProgressDto difficulty,
    List<TopicProgressDto> topics,
    List<CompanyProgressDto> companies,
    List<RecentActivityDto> recentActivity
) {}
