package com.verniq.api.progress;

import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.progress.service.UserProgressService;
import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.domain.SubmissionStatus;
import com.verniq.api.submissions.dto.JudgeResultCallbackRequest;
import com.verniq.api.submissions.queue.SubmissionQueueProducer;
import com.verniq.api.submissions.repository.SubmissionRepository;
import com.verniq.api.submissions.service.SubmissionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionServiceCallbackTest {

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private ProblemRepository problemRepository;

    @Mock
    private SubmissionQueueProducer queueProducer;

    @Mock
    private UserProgressService userProgressService;

    @Mock
    private com.verniq.api.submissions.service.SubmissionRateLimiter rateLimiter;

    @Mock
    private com.verniq.api.submissions.metrics.SubmissionMetrics submissionMetrics;

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
        Problem p = new Problem();
        p.setId(UUID.randomUUID());
        p.setVerniqId("VRQ-000001");
        submission.setProblem(p);
        submission.setStatus(SubmissionStatus.PROCESSING);
    }

    @Test
    @DisplayName("Idempotent Callback: Duplicate judge result callback does NOT trigger userProgressService twice")
    void testDuplicateCallbackDoesNotDuplicateProgressUpdate() {
        when(submissionRepository.findById(submissionId)).thenReturn(Optional.of(submission));
        when(submissionRepository.save(any(Submission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        JudgeResultCallbackRequest callback = new JudgeResultCallbackRequest(
            1,
            "job_123",
            submissionId,
            "accepted",
            100,
            2048,
            5,
            5,
            null,
            "",
            "",
            "",
            null
        );

        // First callback ingestion: status transitions from PROCESSING to ACCEPTED
        submissionService.ingestJudgeResult(callback);
        verify(userProgressService, times(1)).recordSubmissionResult(submission);

        // Second duplicate callback ingestion: submission is ALREADY in terminal state (ACCEPTED)
        submissionService.ingestJudgeResult(callback);

        // Verify userProgressService was NOT called again!
        verify(userProgressService, times(1)).recordSubmissionResult(submission);
    }
}
