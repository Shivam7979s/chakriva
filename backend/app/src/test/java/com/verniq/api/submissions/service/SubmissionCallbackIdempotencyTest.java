package com.verniq.api.submissions.service;

import com.verniq.api.common.exception.ConflictException;
import com.verniq.api.common.exception.InvalidRequestException;
import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.progress.service.UserProgressService;
import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.domain.SubmissionStatus;
import com.verniq.api.submissions.dto.JudgeResultCallbackRequest;
import com.verniq.api.submissions.dto.SubmissionDetailDto;
import com.verniq.api.submissions.metrics.SubmissionMetrics;
import com.verniq.api.submissions.queue.SubmissionQueueProducer;
import com.verniq.api.submissions.repository.SubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionCallbackIdempotencyTest {

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private ProblemRepository problemRepository;

    @Mock
    private SubmissionQueueProducer queueProducer;

    @Mock
    private UserProgressService userProgressService;

    @Mock
    private SubmissionRateLimiter rateLimiter;

    @Mock
    private SubmissionMetrics submissionMetrics;

    private SubmissionService submissionService;

    private UUID submissionId;
    private Submission submission;

    @BeforeEach
    void setUp() {
        submissionService = new SubmissionService(
            submissionRepository, problemRepository, queueProducer, userProgressService, rateLimiter, submissionMetrics
        );

        submissionId = UUID.randomUUID();
        submission = new Submission();
        submission.setId(submissionId);
        submission.setUserId(UUID.randomUUID());
        submission.setJudgeJobId("job_authoritative_01");

        Problem problem = new Problem();
        problem.setId(UUID.randomUUID());
        problem.setVerniqId("VRQ-000001");
        submission.setProblem(problem);
        submission.setStatus(SubmissionStatus.QUEUED);
    }

    @Test
    @DisplayName("Phase 7.1: Identical callback for already-completed submission is idempotent (HTTP 200)")
    void testIdenticalCallbackIsIdempotent() {
        when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
        when(submissionRepository.save(any(Submission.class))).thenAnswer(inv -> inv.getArgument(0));

        JudgeResultCallbackRequest firstCallback = new JudgeResultCallbackRequest(
            1, "job_authoritative_01", submissionId, "ACCEPTED",
            85, 4096, 80, 80, null, null, null, null, Instant.now().toString()
        );

        // First callback transitions to ACCEPTED
        SubmissionDetailDto firstResult = submissionService.ingestJudgeResult(firstCallback);
        assertThat(firstResult.status()).isEqualTo(SubmissionStatus.ACCEPTED);
        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.ACCEPTED);
        verify(userProgressService, times(1)).recordSubmissionResult(submission);

        // Duplicate identical callback
        JudgeResultCallbackRequest duplicateCallback = new JudgeResultCallbackRequest(
            1, "job_authoritative_01", submissionId, "ACCEPTED",
            85, 4096, 80, 80, null, null, null, null, Instant.now().toString()
        );

        SubmissionDetailDto secondResult = submissionService.ingestJudgeResult(duplicateCallback);
        assertThat(secondResult.status()).isEqualTo(SubmissionStatus.ACCEPTED);

        // Must NOT trigger progress recalculation a second time
        verify(userProgressService, times(1)).recordSubmissionResult(submission);
    }

    @Test
    @DisplayName("Phase 7.2: Conflicting callback verdict for completed submission is rejected (HTTP 409)")
    void testConflictingCallbackRejected() {
        submission.setStatus(SubmissionStatus.ACCEPTED);
        submission.setCompletedAt(Instant.now());
        when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));

        JudgeResultCallbackRequest conflictingCallback = new JudgeResultCallbackRequest(
            1, "job_authoritative_01", submissionId, "WRONG_ANSWER",
            85, 4096, 0, 80, 1, null, null, null, Instant.now().toString()
        );

        assertThatThrownBy(() -> submissionService.ingestJudgeResult(conflictingCallback))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Conflicting callback verdict");

        // Progress must never be updated on conflict
        verify(userProgressService, never()).recordSubmissionResult(any());
    }

    @Test
    @DisplayName("Phase 7.3: Mismatched/stale jobId callback is rejected (HTTP 409)")
    void testMismatchedJobIdRejected() {
        when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));

        JudgeResultCallbackRequest mismatchedCallback = new JudgeResultCallbackRequest(
            1, "job_stale_or_alien_99", submissionId, "ACCEPTED",
            85, 4096, 80, 80, null, null, null, null, Instant.now().toString()
        );

        assertThatThrownBy(() -> submissionService.ingestJudgeResult(mismatchedCallback))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Job ID mismatch");

        // Status must remain untouched
        assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.QUEUED);
        verify(userProgressService, never()).recordSubmissionResult(any());
    }

    @Test
    @DisplayName("Phase 7.4: Invalid or unsupported contract version is rejected (HTTP 400)")
    void testInvalidContractVersionRejected() {
        JudgeResultCallbackRequest invalidVersionCallback = new JudgeResultCallbackRequest(
            "99", "job_authoritative_01", submissionId, "worker_1", "COMPLETED", "ACCEPTED",
            85, 4096, 80, 80, null, null, null, null, null, null, null, Instant.now().toString()
        );

        assertThatThrownBy(() -> submissionService.ingestJudgeResult(invalidVersionCallback))
            .isInstanceOf(InvalidRequestException.class)
            .hasMessageContaining("expected '1'");
    }
}
