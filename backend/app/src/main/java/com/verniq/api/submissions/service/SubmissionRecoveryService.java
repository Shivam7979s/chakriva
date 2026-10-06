package com.verniq.api.submissions.service;

import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.domain.SubmissionStatus;
import com.verniq.api.submissions.metrics.SubmissionMetrics;
import com.verniq.api.submissions.repository.SubmissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

/**
 * Recovers orphaned or stuck submissions in QUEUED or PROCESSING states
 * if a judge worker crashes or network partition occurs.
 */
@Service
public class SubmissionRecoveryService {

    private static final Logger log = LoggerFactory.getLogger(SubmissionRecoveryService.class);
    private static final int DEFAULT_STALE_THRESHOLD_SECONDS = 90;

    private final SubmissionRepository submissionRepository;
    private final SubmissionMetrics submissionMetrics;

    public SubmissionRecoveryService(SubmissionRepository submissionRepository,
                                     SubmissionMetrics submissionMetrics) {
        this.submissionRepository = submissionRepository;
        this.submissionMetrics = submissionMetrics;
    }

    /**
     * Periodic scheduled recovery for jobs orphaned by worker crashes.
     */
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void recoverStaleSubmissionsScheduled() {
        recoverStaleSubmissions(DEFAULT_STALE_THRESHOLD_SECONDS);
    }

    /**
     * Finds submissions stuck in pending or running state older than staleSecondsThreshold,
     * transitioning them safely to INTERNAL_ERROR.
     *
     * @param staleSecondsThreshold age in seconds before a job is considered stale
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
}
