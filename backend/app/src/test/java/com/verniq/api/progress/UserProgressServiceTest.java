package com.verniq.api.progress;

import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.progress.domain.ProgressStatus;
import com.verniq.api.progress.domain.UserProblemProgress;
import com.verniq.api.progress.dto.ProblemProgressDto;
import com.verniq.api.progress.dto.ProgressSummaryDto;
import com.verniq.api.progress.repository.UserProblemProgressRepository;
import com.verniq.api.progress.service.UserProgressService;
import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.domain.SubmissionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserProgressServiceTest {

    @Mock
    private UserProblemProgressRepository progressRepository;

    @Mock
    private ProblemRepository problemRepository;

    private UserProgressService progressService;

    private UUID userA;
    private UUID userB;
    private Problem problem1;

    @BeforeEach
    void setUp() {
        progressService = new UserProgressService(progressRepository, problemRepository);
        userA = UUID.randomUUID();
        userB = UUID.randomUUID();

        problem1 = new Problem();
        problem1.setId(UUID.randomUUID());
        problem1.setVerniqId("VRQ-000001");
        problem1.setTitle("Two Sum");
        problem1.setSlug("two-sum");
    }

    @Test
    @DisplayName("Progress Creation: WRONG_ANSWER creates ATTEMPTED progress")
    void testWrongAnswerCreatesAttempted() {
        Submission sub = new Submission();
        sub.setId(UUID.randomUUID());
        sub.setUserId(userA);
        sub.setProblem(problem1);
        sub.setStatus(SubmissionStatus.WRONG_ANSWER);
        Instant now = Instant.now();
        sub.setCreatedAt(now);

        when(progressRepository.findByUserIdAndProblemId(userA, problem1.getId()))
            .thenReturn(Optional.empty());

        progressService.recordSubmissionResult(sub);

        ArgumentCaptor<UserProblemProgress> captor = ArgumentCaptor.forClass(UserProblemProgress.class);
        verify(progressRepository).save(captor.capture());

        UserProblemProgress saved = captor.getValue();
        assertThat(saved.getUserId()).isEqualTo(userA);
        assertThat(saved.getProblem()).isEqualTo(problem1);
        assertThat(saved.getProgressStatus()).isEqualTo(ProgressStatus.ATTEMPTED);
        assertThat(saved.getAttemptCount()).isEqualTo(1);
        assertThat(saved.getFirstAttemptedAt()).isEqualTo(now);
        assertThat(saved.getFirstSolvedAt()).isNull();
    }

    @Test
    @DisplayName("Progress Creation: ACCEPTED creates SOLVED progress")
    void testAcceptedCreatesSolved() {
        Submission sub = new Submission();
        sub.setId(UUID.randomUUID());
        sub.setUserId(userA);
        sub.setProblem(problem1);
        sub.setStatus(SubmissionStatus.ACCEPTED);
        Instant now = Instant.now();
        sub.setCreatedAt(now);

        when(progressRepository.findByUserIdAndProblemId(userA, problem1.getId()))
            .thenReturn(Optional.empty());

        progressService.recordSubmissionResult(sub);

        ArgumentCaptor<UserProblemProgress> captor = ArgumentCaptor.forClass(UserProblemProgress.class);
        verify(progressRepository).save(captor.capture());

        UserProblemProgress saved = captor.getValue();
        assertThat(saved.getProgressStatus()).isEqualTo(ProgressStatus.SOLVED);
        assertThat(saved.getAttemptCount()).isEqualTo(1);
        assertThat(saved.getFirstSolvedAt()).isEqualTo(now);
        assertThat(saved.getLastSolvedAt()).isEqualTo(now);
        assertThat(saved.getAcceptedSubmissionId()).isEqualTo(sub.getId());
    }

    @Test
    @DisplayName("Multiple Attempts: WRONG, WRONG, ACCEPTED, ACCEPTED -> attemptCount=4, status=SOLVED")
    void testMultipleAttemptsProgressSequence() {
        UserProblemProgress existing = new UserProblemProgress(userA, problem1);
        existing.setId(UUID.randomUUID());

        when(progressRepository.findByUserIdAndProblemId(userA, problem1.getId()))
            .thenReturn(Optional.of(existing));

        Instant t1 = Instant.parse("2026-10-01T10:00:00Z");
        Instant t2 = Instant.parse("2026-10-01T10:05:00Z");
        Instant t3 = Instant.parse("2026-10-01T10:10:00Z");
        Instant t4 = Instant.parse("2026-10-01T10:15:00Z");

        // Attempt 1: WRONG
        Submission s1 = new Submission();
        s1.setId(UUID.randomUUID());
        s1.setUserId(userA);
        s1.setProblem(problem1);
        s1.setStatus(SubmissionStatus.WRONG_ANSWER);
        s1.setCreatedAt(t1);
        progressService.recordSubmissionResult(s1);

        assertThat(existing.getProgressStatus()).isEqualTo(ProgressStatus.ATTEMPTED);
        assertThat(existing.getAttemptCount()).isEqualTo(1);
        assertThat(existing.getFirstAttemptedAt()).isEqualTo(t1);

        // Attempt 2: WRONG
        Submission s2 = new Submission();
        s2.setId(UUID.randomUUID());
        s2.setUserId(userA);
        s2.setProblem(problem1);
        s2.setStatus(SubmissionStatus.WRONG_ANSWER);
        s2.setCreatedAt(t2);
        progressService.recordSubmissionResult(s2);

        assertThat(existing.getProgressStatus()).isEqualTo(ProgressStatus.ATTEMPTED);
        assertThat(existing.getAttemptCount()).isEqualTo(2);

        // Attempt 3: ACCEPTED
        Submission s3 = new Submission();
        s3.setId(UUID.randomUUID());
        s3.setUserId(userA);
        s3.setProblem(problem1);
        s3.setStatus(SubmissionStatus.ACCEPTED);
        s3.setCreatedAt(t3);
        progressService.recordSubmissionResult(s3);

        assertThat(existing.getProgressStatus()).isEqualTo(ProgressStatus.SOLVED);
        assertThat(existing.getAttemptCount()).isEqualTo(3);
        assertThat(existing.getFirstSolvedAt()).isEqualTo(t3);
        assertThat(existing.getLastSolvedAt()).isEqualTo(t3);
        assertThat(existing.getAcceptedSubmissionId()).isEqualTo(s3.getId());

        // Attempt 4: ACCEPTED (new submission after solve)
        Submission s4 = new Submission();
        s4.setId(UUID.randomUUID());
        s4.setUserId(userA);
        s4.setProblem(problem1);
        s4.setStatus(SubmissionStatus.ACCEPTED);
        s4.setCreatedAt(t4);
        progressService.recordSubmissionResult(s4);

        assertThat(existing.getProgressStatus()).isEqualTo(ProgressStatus.SOLVED);
        assertThat(existing.getAttemptCount()).isEqualTo(4);
        assertThat(existing.getFirstSolvedAt()).isEqualTo(t3); // Preserved from Attempt 3!
        assertThat(existing.getLastSolvedAt()).isEqualTo(t4);  // Updated to Attempt 4!
        assertThat(existing.getAcceptedSubmissionId()).isEqualTo(s4.getId());
    }

    @Test
    @DisplayName("Progress Invariant: Failed submission AFTER problem is SOLVED does NOT revert SOLVED state")
    void testFailedSubmissionAfterSolvedPreservesSolved() {
        UserProblemProgress existing = new UserProblemProgress(userA, problem1);
        existing.setId(UUID.randomUUID());
        existing.setStatus(ProgressStatus.SOLVED.getDbValue());
        existing.setAttemptCount(1);
        Instant t1 = Instant.parse("2026-10-01T10:00:00Z");
        existing.setFirstSolvedAt(t1);

        when(progressRepository.findByUserIdAndProblemId(userA, problem1.getId()))
            .thenReturn(Optional.of(existing));

        Submission failSub = new Submission();
        failSub.setId(UUID.randomUUID());
        failSub.setUserId(userA);
        failSub.setProblem(problem1);
        failSub.setStatus(SubmissionStatus.TIME_LIMIT_EXCEEDED);
        Instant t2 = Instant.parse("2026-10-01T11:00:00Z");
        failSub.setCreatedAt(t2);

        progressService.recordSubmissionResult(failSub);

        assertThat(existing.getProgressStatus()).isEqualTo(ProgressStatus.SOLVED);
        assertThat(existing.getAttemptCount()).isEqualTo(2);
        assertThat(existing.getLastAttemptedAt()).isEqualTo(t2);
        assertThat(existing.getFirstSolvedAt()).isEqualTo(t1);
    }

    @Test
    @DisplayName("Custom Run: Ephemeral custom run submissions do NOT alter progress")
    void testCustomRunIgnored() {
        Submission customSub = new Submission();
        customSub.setUserId(userA);
        customSub.setProblem(problem1);
        customSub.setCustomRun(true);
        customSub.setStatus(SubmissionStatus.ACCEPTED);

        progressService.recordSubmissionResult(customSub);

        verify(progressRepository, never()).save(any());
    }

    @Test
    @DisplayName("User Isolation: User B cannot access User A's progress")
    void testUserIsolation() {
        when(problemRepository.findByVerniqId("VRQ-000001")).thenReturn(Optional.of(problem1));
        when(progressRepository.findByUserIdAndProblemId(userB, problem1.getId())).thenReturn(Optional.empty());

        ProblemProgressDto dtoB = progressService.getProblemProgress(userB, "VRQ-000001");

        assertThat(dtoB.status()).isEqualTo("UNATTEMPTED");
        assertThat(dtoB.attemptCount()).isEqualTo(0);
        assertThat(dtoB.firstAttemptedAt()).isNull();
        assertThat(dtoB.firstSolvedAt()).isNull();
    }

    @Test
    @DisplayName("Progress Summary: Accurately calculates problem counts, submissions, and acceptance rate")
    void testProgressSummaryAggregation() {
        // Mock problem totals
        List<Object[]> problemTotals = new ArrayList<>();
        problemTotals.add(new Object[]{10L, 15L});
        when(progressRepository.countProblemProgressTotalsForUser(userA)).thenReturn(problemTotals);

        // Mock submission stats
        List<Object[]> subStats = new ArrayList<>();
        subStats.add(new Object[]{25L, 15L});
        when(progressRepository.countSubmissionStatsForUser(userA)).thenReturn(subStats);

        // Mock difficulties
        List<Object[]> diffTotals = new ArrayList<>();
        diffTotals.add(new Object[]{"easy", 20L});
        diffTotals.add(new Object[]{"medium", 30L});
        diffTotals.add(new Object[]{"hard", 10L});
        when(progressRepository.countPublishedProblemsByDifficulty()).thenReturn(diffTotals);

        List<Object[]> diffUser = new ArrayList<>();
        diffUser.add(new Object[]{"easy", 5L, 7L});
        diffUser.add(new Object[]{"medium", 4L, 6L});
        diffUser.add(new Object[]{"hard", 1L, 2L});
        when(progressRepository.countUserProgressByDifficulty(userA)).thenReturn(diffUser);

        // Mock topics
        List<Object[]> topicList = new ArrayList<>();
        topicList.add(new Object[]{"arrays", "Arrays", 10L, 4L, 5L});
        when(progressRepository.aggregateTopicProgressForUser(userA)).thenReturn(topicList);

        // Mock companies
        List<Object[]> companyList = new ArrayList<>();
        companyList.add(new Object[]{"google", "Google", 15L, 6L, 8L});
        when(progressRepository.aggregateCompanyProgressForUser(userA)).thenReturn(companyList);

        when(progressRepository.findRecentActivityForUser(eq(userA), any(Pageable.class)))
            .thenReturn(Collections.emptyList());

        ProgressSummaryDto summary = progressService.getProgressSummary(userA);

        assertThat(summary.totalProblemsSolved()).isEqualTo(10L);
        assertThat(summary.totalProblemsAttempted()).isEqualTo(15L);
        assertThat(summary.totalSubmissions()).isEqualTo(25L);
        assertThat(summary.acceptedSubmissions()).isEqualTo(15L);
        assertThat(summary.submissionAcceptanceRate()).isEqualTo(60.0);

        assertThat(summary.easySolved()).isEqualTo(5L);
        assertThat(summary.mediumSolved()).isEqualTo(4L);
        assertThat(summary.hardSolved()).isEqualTo(1L);

        assertThat(summary.difficulty().easy().total()).isEqualTo(20L);
        assertThat(summary.difficulty().easy().solved()).isEqualTo(5L);
        assertThat(summary.difficulty().easy().attempted()).isEqualTo(7L);

        assertThat(summary.topics()).hasSize(1);
        assertThat(summary.topics().get(0).topicSlug()).isEqualTo("arrays");
        assertThat(summary.topics().get(0).solved()).isEqualTo(4L);

        assertThat(summary.companies()).hasSize(1);
        assertThat(summary.companies().get(0).companySlug()).isEqualTo("google");
        assertThat(summary.companies().get(0).solved()).isEqualTo(6L);
    }
}
