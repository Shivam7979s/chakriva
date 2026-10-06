package com.verniq.api.analytics.service;

import com.verniq.api.analytics.dto.*;
import com.verniq.api.common.exception.InvalidRequestException;
import com.verniq.api.progress.domain.UserProblemProgress;
import com.verniq.api.progress.dto.RecentActivityDto;
import com.verniq.api.progress.repository.UserProblemProgressRepository;
import com.verniq.api.roadmaps.dto.NextRecommendedProblemDto;
import com.verniq.api.roadmaps.dto.RoadmapProgressSummaryDto;
import com.verniq.api.roadmaps.dto.RoadmapSummaryDto;
import com.verniq.api.roadmaps.service.RoadmapService;
import com.verniq.api.submissions.repository.SubmissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Server-authoritative product intelligence and learning analytics service.
 * Derives explainable metrics directly from verified problems, submissions, progress, and roadmap engines.
 */
@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);
    private static final int MIN_SAMPLE_SIZE_FOR_ASSESSMENT = 3;

    private final UserProblemProgressRepository progressRepository;
    private final SubmissionRepository submissionRepository;
    private final RoadmapService roadmapService;

    public AnalyticsService(UserProblemProgressRepository progressRepository,
                            SubmissionRepository submissionRepository,
                            RoadmapService roadmapService) {
        this.progressRepository = progressRepository;
        this.submissionRepository = submissionRepository;
        this.roadmapService = roadmapService;
    }

    @Transactional(readOnly = true)
    public AnalyticsOverviewDto getOverview(UUID userId) {
        if (userId == null) {
            throw new InvalidRequestException("Authenticated user ID is required");
        }

        CodingStatsDto codingStats = getCodingStats(userId);
        DifficultyAnalyticsDto difficultyStats = getDifficultyAnalytics(userId);
        List<TopicAnalyticsDto> topicStats = getTopicAnalytics(userId);
        List<CompanyAnalyticsDto> companyStats = getCompanyAnalytics(userId);
        LearningVelocityDto velocityStats = getLearningVelocity(userId);
        List<TrendPointDto> trendStats = getTrends(userId);
        List<RecentActivityDto> recentActivities = getRecentActivities(userId);
        List<DeterministicInsightDto> insights = generateDeterministicInsights(
            codingStats, topicStats, velocityStats, trendStats
        );

        return new AnalyticsOverviewDto(
            codingStats,
            difficultyStats,
            topicStats,
            companyStats,
            velocityStats,
            trendStats,
            insights,
            recentActivities
        );
    }

    @Transactional(readOnly = true)
    public CodingStatsDto getCodingStats(UUID userId) {
        long totalSolved = 0;
        long totalAttempted = 0;
        List<Object[]> problemTotals = progressRepository.countProblemProgressTotalsForUser(userId);
        if (!problemTotals.isEmpty() && problemTotals.get(0) != null) {
            Object[] row = problemTotals.get(0);
            totalSolved = row[0] != null ? ((Number) row[0]).longValue() : 0;
            totalAttempted = row[1] != null ? ((Number) row[1]).longValue() : 0;
        }

        double problemSolveRate = totalAttempted > 0
            ? roundOneDecimal(((double) totalSolved / totalAttempted) * 100.0)
            : 0.0;

        long totalSubmissions = 0;
        long acceptedSubmissions = 0;
        List<Object[]> subStats = progressRepository.countSubmissionStatsForUser(userId);
        if (!subStats.isEmpty() && subStats.get(0) != null) {
            Object[] row = subStats.get(0);
            totalSubmissions = row[0] != null ? ((Number) row[0]).longValue() : 0;
            acceptedSubmissions = row[1] != null ? ((Number) row[1]).longValue() : 0;
        }

        double submissionAcceptanceRate = totalSubmissions > 0
            ? roundOneDecimal(((double) acceptedSubmissions / totalSubmissions) * 100.0)
            : 0.0;

        Map<String, Long> verdictCounts = new HashMap<>();
        for (Object[] row : submissionRepository.countVerdictDistributionForUser(userId)) {
            if (row != null && row.length >= 2 && row[0] != null) {
                String v = row[0].toString().toLowerCase(Locale.ROOT);
                long count = row[1] != null ? ((Number) row[1]).longValue() : 0;
                verdictCounts.put(v, count);
            }
        }

        long accepted = verdictCounts.getOrDefault("accepted", 0L);
        long wrongAnswer = verdictCounts.getOrDefault("wrong_answer", 0L);
        long compilationError = verdictCounts.getOrDefault("compilation_error", 0L);
        long runtimeError = verdictCounts.getOrDefault("runtime_error", 0L);
        long timeLimitExceeded = verdictCounts.getOrDefault("time_limit_exceeded", 0L);
        long memoryLimitExceeded = verdictCounts.getOrDefault("memory_limit_exceeded", 0L);
        long internalError = verdictCounts.getOrDefault("internal_error", 0L);
        long totalVerdicts = accepted + wrongAnswer + compilationError + runtimeError
            + timeLimitExceeded + memoryLimitExceeded + internalError;

        VerdictDistributionDto verdictDist = new VerdictDistributionDto(
            accepted,
            wrongAnswer,
            compilationError,
            runtimeError,
            timeLimitExceeded,
            memoryLimitExceeded,
            internalError,
            totalVerdicts
        );

        return new CodingStatsDto(
            totalSolved,
            totalAttempted,
            problemSolveRate,
            totalSubmissions,
            acceptedSubmissions,
            submissionAcceptanceRate,
            verdictDist
        );
    }

    @Transactional(readOnly = true)
    public DifficultyAnalyticsDto getDifficultyAnalytics(UUID userId) {
        Map<String, Long> totalPerDiff = new HashMap<>();
        for (Object[] row : progressRepository.countPublishedProblemsByDifficulty()) {
            if (row != null && row.length >= 2 && row[0] != null) {
                totalPerDiff.put(row[0].toString().toLowerCase(Locale.ROOT), ((Number) row[1]).longValue());
            }
        }

        Map<String, Long> solvedPerDiff = new HashMap<>();
        Map<String, Long> attemptedPerDiff = new HashMap<>();
        for (Object[] row : progressRepository.countUserProgressByDifficulty(userId)) {
            if (row != null && row.length >= 3 && row[0] != null) {
                String diff = row[0].toString().toLowerCase(Locale.ROOT);
                solvedPerDiff.put(diff, row[1] != null ? ((Number) row[1]).longValue() : 0L);
                attemptedPerDiff.put(diff, row[2] != null ? ((Number) row[2]).longValue() : 0L);
            }
        }

        DifficultyAnalyticsItemDto easy = buildDiffItem("easy", solvedPerDiff, attemptedPerDiff, totalPerDiff);
        DifficultyAnalyticsItemDto medium = buildDiffItem("medium", solvedPerDiff, attemptedPerDiff, totalPerDiff);
        DifficultyAnalyticsItemDto hard = buildDiffItem("hard", solvedPerDiff, attemptedPerDiff, totalPerDiff);

        long totalSolved = easy.solved() + medium.solved() + hard.solved();
        long totalAttempted = easy.attempted() + medium.attempted() + hard.attempted();
        long totalCatalog = easy.total() + medium.total() + hard.total();

        return new DifficultyAnalyticsDto(
            easy,
            medium,
            hard,
            totalSolved,
            totalAttempted,
            totalCatalog
        );
    }

    private DifficultyAnalyticsItemDto buildDiffItem(String diff, Map<String, Long> solvedMap,
                                                     Map<String, Long> attemptedMap, Map<String, Long> totalMap) {
        long solved = solvedMap.getOrDefault(diff, 0L);
        long attempted = attemptedMap.getOrDefault(diff, 0L);
        long total = totalMap.getOrDefault(diff, 0L);
        double rate = attempted > 0 ? roundOneDecimal(((double) solved / attempted) * 100.0) : 0.0;
        return new DifficultyAnalyticsItemDto(solved, attempted, total, rate);
    }

    @Transactional(readOnly = true)
    public List<TopicAnalyticsDto> getTopicAnalytics(UUID userId) {
        List<TopicAnalyticsDto> list = new ArrayList<>();
        for (Object[] row : progressRepository.aggregateTopicProgressForUser(userId)) {
            if (row != null && row.length >= 5) {
                String slug = row[0] != null ? row[0].toString() : "";
                String name = row[1] != null ? row[1].toString() : "";
                long total = row[2] != null ? ((Number) row[2]).longValue() : 0;
                long solved = row[3] != null ? ((Number) row[3]).longValue() : 0;
                long attempted = row[4] != null ? ((Number) row[4]).longValue() : 0;

                double solveRate = attempted > 0 ? roundOneDecimal(((double) solved / attempted) * 100.0) : 0.0;

                String assessment;
                if (attempted < MIN_SAMPLE_SIZE_FOR_ASSESSMENT) {
                    assessment = "EXPLORING";
                } else if (solveRate >= 70.0) {
                    assessment = "STRONG";
                } else if (solveRate >= 40.0) {
                    assessment = "DEVELOPING";
                } else {
                    assessment = "NEEDS_PRACTICE";
                }

                list.add(new TopicAnalyticsDto(slug, name, solved, attempted, total, solveRate, assessment));
            }
        }
        return list;
    }

    @Transactional(readOnly = true)
    public List<CompanyAnalyticsDto> getCompanyAnalytics(UUID userId) {
        List<CompanyAnalyticsDto> list = new ArrayList<>();
        for (Object[] row : progressRepository.aggregateCompanyProgressForUser(userId)) {
            if (row != null && row.length >= 5) {
                String slug = row[0] != null ? row[0].toString() : "";
                String name = row[1] != null ? row[1].toString() : "";
                long total = row[2] != null ? ((Number) row[2]).longValue() : 0;
                long solved = row[3] != null ? ((Number) row[3]).longValue() : 0;
                long attempted = row[4] != null ? ((Number) row[4]).longValue() : 0;

                double solveRate = attempted > 0 ? roundOneDecimal(((double) solved / attempted) * 100.0) : 0.0;
                list.add(new CompanyAnalyticsDto(slug, name, solved, attempted, total, solveRate));
            }
        }
        return list;
    }

    @Transactional(readOnly = true)
    public LearningVelocityDto getLearningVelocity(UUID userId) {
        Instant now = Instant.now();
        Instant sevenDaysAgo = now.minus(7, ChronoUnit.DAYS);
        Instant thirtyDaysAgo = now.minus(30, ChronoUnit.DAYS);

        long solved7d = progressRepository.countSolvedSince(userId, sevenDaysAgo);
        long solved30d = progressRepository.countSolvedSince(userId, thirtyDaysAgo);
        long submissions7d = submissionRepository.countSubmissionsSince(userId, sevenDaysAgo);

        RoadmapVelocityDto activeRoadmapVelocity = null;
        try {
            List<RoadmapSummaryDto> summaries = roadmapService.getRoadmapsSummary(userId);
            if (!summaries.isEmpty()) {
                RoadmapSummaryDto primaryRoadmap = summaries.get(0);
                RoadmapProgressSummaryDto progress = roadmapService.getRoadmapProgress(primaryRoadmap.getSlug(), userId);
                NextRecommendedProblemDto nextProblem = null;
                try {
                    nextProblem = roadmapService.getNextRecommendedProblem(primaryRoadmap.getSlug(), userId);
                } catch (Exception e) {
                    log.debug("No next recommended problem for roadmap: {}", e.getMessage());
                }

                activeRoadmapVelocity = new RoadmapVelocityDto(
                    primaryRoadmap.getId().toString(),
                    primaryRoadmap.getTitle(),
                    primaryRoadmap.getSlug(),
                    progress != null ? progress.getProgressPercent() : primaryRoadmap.getProgressPercent(),
                    progress != null ? (long) progress.getCompletedNodes() : 0L,
                    progress != null ? (long) progress.getTotalNodes() : 0L,
                    progress != null ? (long) progress.getCompletedItems() : (long) primaryRoadmap.getCompletedItems(),
                    progress != null ? (long) progress.getTotalItems() : (long) primaryRoadmap.getTotalItems(),
                    progress != null ? progress.getCurrentSprintTitle() : null,
                    progress != null ? progress.getCurrentDayNumber() : null,
                    nextProblem != null ? nextProblem.getProblemId() : null,
                    nextProblem != null ? nextProblem.getTitle() : null,
                    nextProblem != null ? nextProblem.getDifficulty() : null
                );
            }
        } catch (Exception e) {
            log.warn("Could not calculate roadmap velocity for user {}: {}", userId, e.getMessage());
        }

        return new LearningVelocityDto(solved7d, solved30d, submissions7d, activeRoadmapVelocity);
    }

    @Transactional(readOnly = true)
    public List<TrendPointDto> getTrends(UUID userId) {
        // Last 6 rolling 7-day periods
        Instant now = Instant.now();
        Instant sixWeeksAgo = now.minus(42, ChronoUnit.DAYS);

        List<Instant> solvedList = progressRepository.findSolvedTimestampsSince(userId, sixWeeksAgo);
        List<Object[]> subRows = submissionRepository.findSubmissionsSince(userId, sixWeeksAgo);

        List<TrendPointDto> trendPoints = new ArrayList<>();
        DateTimeFormatter labelFormatter = DateTimeFormatter.ofPattern("MMM d", Locale.US).withZone(ZoneOffset.UTC);

        for (int i = 5; i >= 0; i--) {
            Instant bucketStart = now.minus((i + 1) * 7L, ChronoUnit.DAYS);
            Instant bucketEnd = now.minus(i * 7L, ChronoUnit.DAYS);

            long solvedCount = solvedList.stream()
                .filter(t -> !t.isBefore(bucketStart) && t.isBefore(bucketEnd))
                .count();

            long submissionCount = subRows.stream()
                .filter(row -> {
                    if (row != null && row.length >= 1 && row[0] instanceof Instant t) {
                        return !t.isBefore(bucketStart) && t.isBefore(bucketEnd);
                    }
                    return false;
                })
                .count();

            String label = labelFormatter.format(bucketStart) + " - " + labelFormatter.format(bucketEnd.minus(1, ChronoUnit.DAYS));
            String periodKey = "W-" + (6 - i);

            trendPoints.add(new TrendPointDto(periodKey, label, solvedCount, submissionCount));
        }

        return trendPoints;
    }

    private List<RecentActivityDto> getRecentActivities(UUID userId) {
        List<RecentActivityDto> list = new ArrayList<>();
        List<UserProblemProgress> recent = progressRepository.findRecentActivityForUser(userId, PageRequest.of(0, 10));
        for (UserProblemProgress p : recent) {
            if (p.getProblem() != null) {
                list.add(new RecentActivityDto(
                    p.getProblem().getId(),
                    p.getProblem().getVerniqId(),
                    p.getProblem().getTitle(),
                    p.getProblem().getDifficulty() != null ? p.getProblem().getDifficulty().name().toLowerCase() : "medium",
                    p.getStatus(),
                    p.getLastAttemptedAt()
                ));
            }
        }
        return list;
    }

    private List<DeterministicInsightDto> generateDeterministicInsights(CodingStatsDto coding,
                                                                        List<TopicAnalyticsDto> topics,
                                                                        LearningVelocityDto velocity,
                                                                        List<TrendPointDto> trends) {
        List<DeterministicInsightDto> insights = new ArrayList<>();

        // 1. Empty state guard
        if (coding.problemsAttempted() == 0 && coding.totalSubmissions() == 0) {
            insights.add(new DeterministicInsightDto(
                "WELCOME",
                "Start Your Learning Journey",
                "No coding activity recorded yet. Solve your first problem to unlock personalized intelligence and skill assessments."
            ));
            return insights;
        }

        // 2. Velocity Insight
        if (velocity.problemsSolvedLast7Days() > 0) {
            insights.add(new DeterministicInsightDto(
                "VELOCITY",
                "Strong Weekly Velocity",
                "You solved " + velocity.problemsSolvedLast7Days() + " problem(s) in the last 7 days across "
                    + velocity.submissionsLast7Days() + " submission(s)."
            ));
        } else {
            insights.add(new DeterministicInsightDto(
                "MOMENTUM",
                "Ready for Momentum",
                "No problems solved in the last 7 days. Solve a challenge today to maintain active engineering momentum."
            ));
        }

        // 3. Topic Strength Insight (highest solve rate with >= 3 attempts)
        topics.stream()
            .filter(t -> "STRONG".equals(t.assessment()))
            .max(Comparator.comparingDouble(TopicAnalyticsDto::solveRate))
            .ifPresent(strongest -> insights.add(new DeterministicInsightDto(
                "STRENGTH",
                "Top Proficiency in " + strongest.name(),
                "Your strongest algorithmic topic is " + strongest.name() + " with a "
                    + strongest.solveRate() + "% solve rate (" + strongest.solved() + "/" + strongest.attempted() + " solved)."
            )));

        // 4. Topic Focus Area Insight (lowest solve rate with >= 3 attempts)
        topics.stream()
            .filter(t -> "NEEDS_PRACTICE".equals(t.assessment()))
            .min(Comparator.comparingDouble(TopicAnalyticsDto::solveRate))
            .ifPresent(focus -> insights.add(new DeterministicInsightDto(
                "FOCUS_AREA",
                "Practice Focus: " + focus.name(),
                focus.name() + " has your lowest solve rate at " + focus.solveRate() + "% ("
                    + focus.solved() + "/" + focus.attempted() + "). Consider focused review on core patterns."
            )));

        // 5. Roadmap Recommendation Insight
        if (velocity.activeRoadmap() != null) {
            RoadmapVelocityDto r = velocity.activeRoadmap();
            if (r.nextRecommendedVerniqId() != null) {
                insights.add(new DeterministicInsightDto(
                    "RECOMMENDATION",
                    "Next Action: " + r.nextRecommendedVerniqId(),
                    "Continue " + r.roadmapTitle() + " (" + r.progressPercent() + "% complete). Recommended next: "
                        + r.nextRecommendedVerniqId() + " — " + r.nextRecommendedTitle() + "."
                ));
            } else if (r.progressPercent() >= 100.0) {
                insights.add(new DeterministicInsightDto(
                    "ACHIEVEMENT",
                    r.roadmapTitle() + " Completed",
                    "You have completed 100% of " + r.roadmapTitle() + "!"
                ));
            }
        }

        return insights;
    }

    private double roundOneDecimal(double val) {
        return Math.round(val * 10.0) / 10.0;
    }
}
