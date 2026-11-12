package com.verniq.api.submissions.service;

import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.domain.SubmissionStatus;
import com.verniq.api.submissions.metrics.SubmissionMetrics;
import com.verniq.api.submissions.queue.SubmissionQueueProducer;
import com.verniq.api.submissions.repository.SubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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

    @Mock
    private org.springframework.data.redis.core.StringRedisTemplate stringRedisTemplate;

    @Mock
    private org.springframework.data.redis.core.ZSetOperations<String, String> zSetOperations;

    @Mock
    private org.springframework.data.redis.core.HashOperations<String, Object, Object> hashOperations;

    @Mock
    private org.springframework.data.redis.core.ListOperations<String, String> listOperations;

    @Mock
    private SubmissionQueueProducer queueProducer;

    private SubmissionRecoveryService recoveryService;

    @BeforeEach
    void setUp() {
        recoveryService = new SubmissionRecoveryService(
            submissionRepository,
            submissionMetrics,
            stringRedisTemplate,
            queueProducer,
            new com.fasterxml.jackson.databind.ObjectMapper()
        );
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
    void recoversStaleSubmissionsSkipsWhenLeaseStillValid() {
        Submission uncompletedWithLease = new Submission();
        uncompletedWithLease.setId(UUID.randomUUID());
        uncompletedWithLease.setStatus(SubmissionStatus.PROCESSING);
        uncompletedWithLease.setJudgeJobId("job_leased_123");
        // Lease valid for another 60 seconds
        uncompletedWithLease.setLeaseExpiresAt(Instant.now().plusSeconds(60));

        when(submissionRepository.findStaleSubmissions(any(), any())).thenReturn(List.of(uncompletedWithLease));

        int recovered = recoveryService.recoverStaleSubmissions(90);

        assertEquals(0, recovered);
        assertEquals(SubmissionStatus.PROCESSING, uncompletedWithLease.getStatus());
        verify(submissionRepository, never()).save(any());
    }

    @Test
    void doesNothingWhenNoStaleSubmissions() {
        when(submissionRepository.findStaleSubmissions(any(), any())).thenReturn(List.of());

        int recovered = recoveryService.recoverStaleSubmissions(90);

        assertEquals(0, recovered);
        verify(submissionRepository, never()).save(any());
        verify(submissionMetrics, never()).recordSubmissionFailed(any());
    }

    @Test
    void recoverExpiredLeasesRequeuesJobWhenAttemptBelowMax() {
        String jobId = "job_recover_01";
        UUID subId = UUID.randomUUID();
        String rawPayload = "{\"judgeJobId\":\"" + jobId + "\",\"submissionId\":\"" + subId + "\",\"attempt\":1}";

        Submission submission = new Submission();
        submission.setId(subId);
        submission.setStatus(SubmissionStatus.PROCESSING);
        submission.setAttempt(1);
        submission.setMaxAttempts(3);
        submission.setLanguage("java");

        when(stringRedisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(stringRedisTemplate.opsForHash()).thenReturn(hashOperations);
        when(stringRedisTemplate.opsForList()).thenReturn(listOperations);
        when(queueProducer.getQueueName()).thenReturn("verniq:submissions:queue");

        when(zSetOperations.rangeByScore(eq(SubmissionRecoveryService.ACTIVE_LEASES_KEY), eq(0.0), anyDouble()))
            .thenReturn(Set.of(jobId));
        when(zSetOperations.remove(SubmissionRecoveryService.ACTIVE_LEASES_KEY, jobId)).thenReturn(1L);

        Map<Object, Object> leaseHash = Map.of(
            "submissionId", subId.toString(),
            "workerId", "worker-1",
            "attempt", "1",
            "payload", rawPayload
        );
        when(hashOperations.entries(SubmissionRecoveryService.LEASE_PREFIX + jobId)).thenReturn(leaseHash);
        when(submissionRepository.findById(subId)).thenReturn(Optional.of(submission));

        int recovered = recoveryService.recoverExpiredLeases();

        assertEquals(1, recovered);
        assertEquals(SubmissionStatus.QUEUED, submission.getStatus());
        assertEquals(2, submission.getAttempt());
        assertNull(submission.getLeaseExpiresAt());
        assertNull(submission.getWorkerId());

        verify(listOperations, times(1)).rightPush(eq("verniq:submissions:queue"), contains("\"attempt\":2"));
        verify(submissionRepository, times(1)).save(submission);
        verify(submissionMetrics, times(1)).recordSubmissionCreated("java");
    }

    @Test
    void recoverExpiredLeasesMarksInternalErrorWhenMaxAttemptsExceeded() {
        String jobId = "job_recover_max";
        UUID subId = UUID.randomUUID();
        String rawPayload = "{\"judgeJobId\":\"" + jobId + "\",\"submissionId\":\"" + subId + "\",\"attempt\":3}";

        Submission submission = new Submission();
        submission.setId(subId);
        submission.setStatus(SubmissionStatus.PROCESSING);
        submission.setAttempt(3);
        submission.setMaxAttempts(3);

        when(stringRedisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(stringRedisTemplate.opsForHash()).thenReturn(hashOperations);
        when(stringRedisTemplate.opsForList()).thenReturn(listOperations);

        when(zSetOperations.rangeByScore(eq(SubmissionRecoveryService.ACTIVE_LEASES_KEY), eq(0.0), anyDouble()))
            .thenReturn(Set.of(jobId));
        when(zSetOperations.remove(SubmissionRecoveryService.ACTIVE_LEASES_KEY, jobId)).thenReturn(1L);

        Map<Object, Object> leaseHash = Map.of(
            "submissionId", subId.toString(),
            "workerId", "worker-1",
            "attempt", "3",
            "payload", rawPayload
        );
        when(hashOperations.entries(SubmissionRecoveryService.LEASE_PREFIX + jobId)).thenReturn(leaseHash);
        when(submissionRepository.findById(subId)).thenReturn(Optional.of(submission));

        int recovered = recoveryService.recoverExpiredLeases();

        assertEquals(1, recovered);
        assertEquals(SubmissionStatus.INTERNAL_ERROR, submission.getStatus());
        assertTrue(submission.getErrorMessage().contains("Execution failed across all 3 attempts"));
        assertNotNull(submission.getCompletedAt());

        verify(submissionRepository, times(1)).save(submission);
        verify(submissionMetrics, times(1)).recordSubmissionFailed("MAX_ATTEMPTS_EXCEEDED");
    }

    @Test
    void recoverExpiredLeasesProtectsTerminalSubmissionsFromOverwrite() {
        String jobId = "job_already_terminal";
        UUID subId = UUID.randomUUID();
        String rawPayload = "{\"judgeJobId\":\"" + jobId + "\",\"submissionId\":\"" + subId + "\",\"attempt\":1}";

        Submission submission = new Submission();
        submission.setId(subId);
        submission.setStatus(SubmissionStatus.ACCEPTED); // Already terminal!

        when(stringRedisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(stringRedisTemplate.opsForHash()).thenReturn(hashOperations);
        when(stringRedisTemplate.opsForList()).thenReturn(listOperations);

        when(zSetOperations.rangeByScore(eq(SubmissionRecoveryService.ACTIVE_LEASES_KEY), eq(0.0), anyDouble()))
            .thenReturn(Set.of(jobId));
        when(zSetOperations.remove(SubmissionRecoveryService.ACTIVE_LEASES_KEY, jobId)).thenReturn(1L);

        Map<Object, Object> leaseHash = Map.of(
            "submissionId", subId.toString(),
            "workerId", "worker-1",
            "attempt", "1",
            "payload", rawPayload
        );
        when(hashOperations.entries(SubmissionRecoveryService.LEASE_PREFIX + jobId)).thenReturn(leaseHash);
        when(submissionRepository.findById(subId)).thenReturn(Optional.of(submission));

        int recovered = recoveryService.recoverExpiredLeases();

        assertEquals(0, recovered);
        assertEquals(SubmissionStatus.ACCEPTED, submission.getStatus());
        verify(submissionRepository, never()).save(any());
        verify(listOperations, never()).rightPush(any(), any());
    }

    @Test
    void recoverExpiredLeasesSkipsWhenAtomicCASLost() {
        String jobId = "job_cas_lost";

        when(stringRedisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(zSetOperations.rangeByScore(eq(SubmissionRecoveryService.ACTIVE_LEASES_KEY), eq(0.0), anyDouble()))
            .thenReturn(Set.of(jobId));
        // Another instance removed it first
        when(zSetOperations.remove(SubmissionRecoveryService.ACTIVE_LEASES_KEY, jobId)).thenReturn(0L);

        int recovered = recoveryService.recoverExpiredLeases();

        assertEquals(0, recovered);
        verify(submissionRepository, never()).findById(any());
    }
}
