package com.verniq.api.submissions.service;

import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.domain.SubmissionStatus;
import com.verniq.api.submissions.metrics.SubmissionMetrics;
import com.verniq.api.submissions.repository.SubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubmissionRecoveryServiceTest {

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private SubmissionMetrics submissionMetrics;

    private SubmissionRecoveryService recoveryService;

    @BeforeEach
    void setUp() {
        recoveryService = new SubmissionRecoveryService(submissionRepository, submissionMetrics);
    }

    @Test
    void recoversStaleSubmissionsToInternalError() {
        Submission stale = new Submission();
        stale.setId(UUID.randomUUID());
        stale.setStatus(SubmissionStatus.QUEUED);
        stale.setJudgeJobId("job_stale_123");

        when(submissionRepository.findStaleSubmissions(any(), any())).thenReturn(List.of(stale));

        int recovered = recoveryService.recoverStaleSubmissions(90);

        assertEquals(1, recovered);
        assertEquals(SubmissionStatus.INTERNAL_ERROR, stale.getStatus());
        assertNotNull(stale.getErrorMessage());
        assertTrue(stale.getErrorMessage().contains("timed out in judge pipeline"));
        assertNotNull(stale.getCompletedAt());

        verify(submissionRepository, times(1)).save(stale);
        verify(submissionMetrics, times(1)).recordSubmissionFailed("STALE_TIMEOUT");
    }

    @Test
    void doesNothingWhenNoStaleSubmissions() {
        when(submissionRepository.findStaleSubmissions(any(), any())).thenReturn(List.of());

        int recovered = recoveryService.recoverStaleSubmissions(90);

        assertEquals(0, recovered);
        verify(submissionRepository, never()).save(any());
        verify(submissionMetrics, never()).recordSubmissionFailed(any());
    }
}
