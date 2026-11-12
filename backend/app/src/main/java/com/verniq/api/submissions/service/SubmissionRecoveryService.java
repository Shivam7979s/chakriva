package com.verniq.api.submissions.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.domain.SubmissionStatus;
import com.verniq.api.submissions.metrics.SubmissionMetrics;
import com.verniq.api.submissions.queue.SubmissionQueueProducer;
import com.verniq.api.submissions.repository.SubmissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Recovers orphaned or stuck submissions in QUEUED or PROCESSING states
 * if a judge worker crashes or network partition occurs.
 *
 * <p>Phase J.9.4: Implements at-least-once job delivery with Redis lease expiration,
 * attempt counting, terminal-state protection, and automatic requeue.</p>
 */
@Service
public class SubmissionRecoveryService {

    private static final Logger log = LoggerFactory.getLogger(SubmissionRecoveryService.class);
    public static final int DEFAULT_STALE_THRESHOLD_SECONDS = 90;
    public static final String ACTIVE_LEASES_KEY = "verniq:submissions:leases:active";
    public static final String LEASE_PREFIX = "verniq:submissions:lease:";
    public static final String PROCESSING_QUEUE_PREFIX = "verniq:submissions:processing:";

    private final SubmissionRepository submissionRepository;
    private final SubmissionMetrics submissionMetrics;
    private final StringRedisTemplate stringRedisTemplate;
    private final SubmissionQueueProducer queueProducer;
    private final ObjectMapper objectMapper;

    @Autowired
    public SubmissionRecoveryService(
            SubmissionRepository submissionRepository,
            SubmissionMetrics submissionMetrics,
            @Autowired(required = false) StringRedisTemplate stringRedisTemplate,
            @Autowired(required = false) SubmissionQueueProducer queueProducer,
            @Autowired(required = false) ObjectMapper objectMapper
    ) {
        this.submissionRepository = submissionRepository;
        this.submissionMetrics = submissionMetrics;
        this.stringRedisTemplate = stringRedisTemplate;
        this.queueProducer = queueProducer;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    /**
     * Backward-compatible constructor for existing tests and components.
     */
    public SubmissionRecoveryService(SubmissionRepository submissionRepository,
                                     SubmissionMetrics submissionMetrics) {
        this(submissionRepository, submissionMetrics, null, null, null);
    }

    /**
     * Periodic scheduled recovery for jobs orphaned by worker crashes.
     */
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void recoverStaleSubmissionsScheduled() {
        recoverExpiredLeases();
        recoverStaleSubmissions(DEFAULT_STALE_THRESHOLD_SECONDS);
    }

    /**
     * Inspects active Redis leases whose expiration timestamp has passed.
     * Requeues jobs whose attempt count has not exceeded maxAttempts;
     * transitions to INTERNAL_ERROR if maxAttempts is exhausted.
     *
     * @return count of recovered/requeued jobs
     */
    @Transactional
    public int recoverExpiredLeases() {
        if (stringRedisTemplate == null) {
            return 0;
        }

        long nowMs = System.currentTimeMillis();
        Set<String> expiredJobIds = stringRedisTemplate.opsForZSet().rangeByScore(ACTIVE_LEASES_KEY, 0, nowMs);
        if (expiredJobIds == null || expiredJobIds.isEmpty()) {
            return 0;
        }

        int recoveredCount = 0;
        for (String jobId : expiredJobIds) {
            // Atomic CAS claim: remove from active leases to prevent race conditions across nodes
            Long removed = stringRedisTemplate.opsForZSet().remove(ACTIVE_LEASES_KEY, jobId);
            if (removed == null || removed == 0) {
                continue; // Another recovery coordinator instance claimed this job
            }

            String leaseKey = LEASE_PREFIX + jobId;
            Map<Object, Object> leaseEntries = stringRedisTemplate.opsForHash().entries(leaseKey);
            if (leaseEntries == null || leaseEntries.isEmpty()) {
                continue;
            }

            String submissionIdStr = (String) leaseEntries.get("submissionId");
            String workerId = (String) leaseEntries.get("workerId");
            String rawPayload = (String) leaseEntries.get("payload");
            int attempt = 1;
            try {
                attempt = Integer.parseInt((String) leaseEntries.getOrDefault("attempt", "1"));
            } catch (Exception ignored) {}

            if (submissionIdStr == null || submissionIdStr.isBlank()) {
                cleanupRedisLease(jobId, workerId, rawPayload);
                continue;
            }

            UUID submissionId;
            try {
                submissionId = UUID.fromString(submissionIdStr);
            } catch (Exception e) {
                cleanupRedisLease(jobId, workerId, rawPayload);
                continue;
            }

            Optional<Submission> optSub = submissionRepository.findById(submissionId);
            if (optSub.isEmpty()) {
                cleanupRedisLease(jobId, workerId, rawPayload);
                continue;
            }

            Submission submission = optSub.get();

            // Terminal-state protection: If already in terminal status, NEVER overwrite or re-execute!
            if (submission.getStatus().isTerminal()) {
                log.info("SUBMISSION_LEASE_EXPIRED_TERMINAL submissionId={} judgeJobId={} currentStatus={} (cleaning up without re-executing)",
                    submission.getId(), jobId, submission.getStatus());
                cleanupRedisLease(jobId, workerId, rawPayload);
                continue;
            }

            int maxAttempts = submission.getMaxAttempts() > 0 ? submission.getMaxAttempts() : 3;
            if (attempt < maxAttempts) {
                int nextAttempt = attempt + 1;
                cleanupRedisLease(jobId, workerId, rawPayload);

                // Update payload JSON with incremented attempt
                String requeuePayload = updatePayloadAttempt(rawPayload, nextAttempt);

                // Requeue to main ready list
                String targetQueue = (queueProducer != null) ? queueProducer.getQueueName() : SubmissionQueueProducer.DEFAULT_QUEUE_KEY;
                stringRedisTemplate.opsForList().rightPush(targetQueue, requeuePayload);

                // Update PostgreSQL submission
                submission.setAttempt(nextAttempt);
                submission.setStatus(SubmissionStatus.QUEUED);
                submission.setStartedAt(null);
                submission.setLeaseExpiresAt(null);
                submission.setWorkerId(null);
                submissionRepository.save(submission);

                submissionMetrics.recordSubmissionCreated(submission.getLanguage());
                log.warn("SUBMISSION_REQUEUED submissionId={} judgeJobId={} previousAttempt={} nextAttempt={} maxAttempts={}",
                    submission.getId(), jobId, attempt, nextAttempt, maxAttempts);
                recoveredCount++;
            } else {
                // Max retry ceiling reached
                cleanupRedisLease(jobId, workerId, rawPayload);

                submission.setStatus(SubmissionStatus.INTERNAL_ERROR);
                submission.setErrorMessage("Execution failed across all " + maxAttempts + " attempts (worker node unreachable or crashed).");
                submission.setCompletedAt(Instant.now());
                submissionRepository.save(submission);

                submissionMetrics.recordSubmissionFailed("MAX_ATTEMPTS_EXCEEDED");
                log.error("SUBMISSION_MAX_ATTEMPTS_EXCEEDED submissionId={} judgeJobId={} attempts={}",
                    submission.getId(), jobId, attempt);
                recoveredCount++;
            }
        }
        return recoveredCount;
    }

    /**
     * Finds submissions stuck in pending or running state older than staleSecondsThreshold,
     * transitioning them safely to INTERNAL_ERROR only if no active lease is valid.
     *
     * @param staleSecondsThreshold age in seconds before an unleased job is considered stale
     * @return count of recovered submissions
     */
    @Transactional
    public int recoverStaleSubmissions(int staleSecondsThreshold) {
        long startMs = System.currentTimeMillis();
        Instant cutoff = Instant.now().minus(staleSecondsThreshold, ChronoUnit.SECONDS);
        List<String> uncompletedVerdicts = List.of(
            SubmissionStatus.QUEUED.toDbVerdict(),
            SubmissionStatus.PROCESSING.toDbVerdict()
        );

        List<Submission> staleList = submissionRepository.findStaleSubmissions(uncompletedVerdicts, cutoff);
        if (staleList.isEmpty()) {
            return 0;
        }

        submissionMetrics.recordRecoveryDetected(staleList.size());
        int recoveredCount = 0;
        for (Submission sub : staleList) {
            // Guard: Do NOT prematurely fail submissions that hold a valid, non-expired lease!
            if (sub.getLeaseExpiresAt() != null && sub.getLeaseExpiresAt().isAfter(Instant.now())) {
                log.debug("Skipping submission {} as active lease is valid until {}", sub.getId(), sub.getLeaseExpiresAt());
                continue;
            }

            String prevStatus = sub.getStatus().name();
            long ageSeconds = sub.getCreatedAt() != null ? ChronoUnit.SECONDS.between(sub.getCreatedAt(), Instant.now()) : -1;
            try {
                sub.setStatus(SubmissionStatus.INTERNAL_ERROR);
                sub.setErrorMessage("Execution timed out in judge pipeline. Automatically recovered by platform.");
                sub.setCompletedAt(Instant.now());
                submissionRepository.save(sub);

                submissionMetrics.recordSubmissionFailed("STALE_TIMEOUT");
                log.warn("SUBMISSION_RECOVERED submissionId={} judgeJobId={} previousState={} newState=INTERNAL_ERROR ageSeconds={} (created: {})",
                    sub.getId(), sub.getJudgeJobId(), prevStatus, ageSeconds, sub.getCreatedAt());
                recoveredCount++;
            } catch (Exception e) {
                submissionMetrics.recordRecoveryFailed(1);
                log.error("Failed to recover stale submission {} [jobId={}]: {}", sub.getId(), sub.getJudgeJobId(), e.getMessage());
            }
        }

        submissionMetrics.recordRecoveryCompleted(recoveredCount);
        long durationMs = System.currentTimeMillis() - startMs;
        log.info("SUBMISSION_RECOVERY_COMPLETED detected={} recovered={} durationMs={}", staleList.size(), recoveredCount, durationMs);
        return recoveredCount;
    }

    private void cleanupRedisLease(String jobId, String workerId, String rawPayload) {
        if (stringRedisTemplate == null) {
            return;
        }
        try {
            stringRedisTemplate.delete(LEASE_PREFIX + jobId);
            stringRedisTemplate.opsForZSet().remove(ACTIVE_LEASES_KEY, jobId);
            if (workerId != null && !workerId.isBlank() && rawPayload != null && !rawPayload.isBlank()) {
                stringRedisTemplate.opsForList().remove(PROCESSING_QUEUE_PREFIX + workerId, 1, rawPayload);
            }
        } catch (Exception e) {
            log.warn("Failed to clean Redis lease keys for jobId={}: {}", jobId, e.getMessage());
        }
    }

    private String updatePayloadAttempt(String rawPayload, int nextAttempt) {
        if (rawPayload == null || rawPayload.isBlank()) {
            return rawPayload;
        }
        try {
            JsonNode root = objectMapper.readTree(rawPayload);
            if (root instanceof ObjectNode objectNode) {
                objectNode.put("attempt", nextAttempt);
                return objectMapper.writeValueAsString(objectNode);
            }
        } catch (Exception e) {
            log.warn("Failed to parse and update payload attempt: {}", e.getMessage());
        }
        return rawPayload;
    }
}
