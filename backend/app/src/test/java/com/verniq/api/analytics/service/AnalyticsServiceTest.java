package com.verniq.api.analytics.service;

import com.verniq.api.analytics.dto.*;
import com.verniq.api.progress.domain.UserProblemProgress;
import com.verniq.api.progress.repository.UserProblemProgressRepository;
import com.verniq.api.roadmaps.dto.NextRecommendedProblemDto;
import com.verniq.api.roadmaps.dto.RoadmapProgressSummaryDto;
import com.verniq.api.roadmaps.dto.RoadmapSummaryDto;
import com.verniq.api.roadmaps.service.RoadmapService;
import com.verniq.api.submissions.repository.SubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private UserProblemProgressRepository progressRepository;

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private RoadmapService roadmapService;

    private AnalyticsService analyticsService;

    @BeforeEach
    void setUp() {
        analyticsService = new AnalyticsService(progressRepository, submissionRepository, roadmapService);
    }

    @Test
    void testCodingStatsAndVerdictDistribution() {
        UUID userId = UUID.randomUUID();

        // 3 problems solved out of 4 attempted
        when(progressRepository.countProblemProgressTotalsForUser(userId))
            .thenReturn(List.<Object[]>of(new Object[]{3L, 4L}));

        // 5 accepted submissions out of 8 total
        when(progressRepository.countSubmissionStatsForUser(userId))
            .thenReturn(List.<Object[]>of(new Object[]{8L, 5L}));

        when(submissionRepository.countVerdictDistributionForUser(userId))
            .thenReturn(List.<Object[]>of(
                new Object[]{"accepted", 5L},
                new Object[]{"wrong_answer", 2L},
                new Object[]{"compilation_error", 1L}
            ));

        CodingStatsDto stats = analyticsService.getCodingStats(userId);

        assertEquals(3, stats.problemsSolved());
        assertEquals(4, stats.problemsAttempted());
        assertEquals(75.0, stats.problemSolveRate()); // 3/4 = 75.0%

        assertEquals(8, stats.totalSubmissions());
        assertEquals(5, stats.acceptedSubmissions());
        assertEquals(62.5, stats.submissionAcceptanceRate()); // 5/8 = 62.5%

        assertEquals(5, stats.verdictDistribution().accepted());
        assertEquals(2, stats.verdictDistribution().wrongAnswer());
        assertEquals(1, stats.verdictDistribution().compilationError());
        assertEquals(0, stats.verdictDistribution().runtimeError());
    }

    @Test
    void testTopicAssessmentAndSampleSizeSafety() {
        UUID userId = UUID.randomUUID();

        // Topic 1: Arrays (10 attempted, 8 solved -> 80.0% -> STRONG)
        // Topic 2: Dynamic Programming (1 attempted, 0 solved -> 0% but < 3 attempts -> EXPLORING, not false weakness)
        // Topic 3: Graphs (5 attempted, 1 solved -> 20.0% -> NEEDS_PRACTICE)
        // Topic 4: Trees (4 attempted, 2 solved -> 50.0% -> DEVELOPING)
        when(progressRepository.aggregateTopicProgressForUser(userId))
            .thenReturn(List.<Object[]>of(
                new Object[]{"arrays", "Arrays", 20L, 8L, 10L},
                new Object[]{"dynamic-programming", "Dynamic Programming", 15L, 0L, 1L},
                new Object[]{"graphs", "Graphs", 10L, 1L, 5L},
                new Object[]{"trees", "Trees", 12L, 2L, 4L}
            ));

        List<TopicAnalyticsDto> topics = analyticsService.getTopicAnalytics(userId);

        assertEquals(4, topics.size());

        TopicAnalyticsDto arrays = topics.stream().filter(t -> t.slug().equals("arrays")).findFirst().orElseThrow();
        assertEquals("STRONG", arrays.assessment());
        assertEquals(80.0, arrays.solveRate());

        TopicAnalyticsDto dp = topics.stream().filter(t -> t.slug().equals("dynamic-programming")).findFirst().orElseThrow();
        assertEquals("EXPLORING", dp.assessment(), "1 attempt must be EXPLORING to prevent false weakness classification");

        TopicAnalyticsDto graphs = topics.stream().filter(t -> t.slug().equals("graphs")).findFirst().orElseThrow();
        assertEquals("NEEDS_PRACTICE", graphs.assessment());

        TopicAnalyticsDto trees = topics.stream().filter(t -> t.slug().equals("trees")).findFirst().orElseThrow();
        assertEquals("DEVELOPING", trees.assessment());
    }

    @Test
    void testEmptyUserOverviewReceivesCleanState() {
        UUID userId = UUID.randomUUID();

        when(progressRepository.countProblemProgressTotalsForUser(userId)).thenReturn(Collections.emptyList());
        when(progressRepository.countSubmissionStatsForUser(userId)).thenReturn(Collections.emptyList());
        when(submissionRepository.countVerdictDistributionForUser(userId)).thenReturn(Collections.emptyList());
        when(progressRepository.countPublishedProblemsByDifficulty()).thenReturn(Collections.emptyList());
        when(progressRepository.countUserProgressByDifficulty(userId)).thenReturn(Collections.emptyList());
        when(progressRepository.aggregateTopicProgressForUser(userId)).thenReturn(Collections.emptyList());
        when(progressRepository.aggregateCompanyProgressForUser(userId)).thenReturn(Collections.emptyList());
        when(roadmapService.getRoadmapsSummary(userId)).thenReturn(Collections.emptyList());
        when(progressRepository.findRecentActivityForUser(eq(userId), any(Pageable.class))).thenReturn(Collections.emptyList());

        AnalyticsOverviewDto overview = analyticsService.getOverview(userId);

        assertNotNull(overview);
        assertEquals(0, overview.coding().problemsSolved());
        assertEquals(0, overview.coding().problemsAttempted());
        assertEquals(0.0, overview.coding().problemSolveRate());
        assertEquals(0.0, overview.coding().submissionAcceptanceRate());

        assertTrue(overview.insights().stream().anyMatch(i -> "WELCOME".equals(i.category())));
    }
}
