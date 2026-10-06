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
        Instant cutoff = Instant.now().minus(staleSecondsThreshold, ChronoUnit.SECONDS);
        List<String> uncompletedVerdicts = List.of(
            SubmissionStatus.QUEUED.toDbVerdict(),
            SubmissionStatus.PROCESSING.toDbVerdict()
        );

        List<Submission> staleList = submissionRepository.findStaleSubmissions(uncompletedVerdicts, cutoff);
        if (staleList.isEmpty()) {
            return 0;
        }

        int recoveredCount = 0;
        for (Submission sub : staleList) {
            String prevStatus = sub.getStatus().name();
            sub.setStatus(SubmissionStatus.INTERNAL_ERROR);
            sub.setErrorMessage("Execution timed out in judge pipeline. Automatically recovered by platform.");
            sub.setCompletedAt(Instant.now());
            submissionRepository.save(sub);

            submissionMetrics.recordSubmissionFailed("STALE_TIMEOUT");
            log.warn("Recovered stale submission {} [jobId={}] from {} to INTERNAL_ERROR (created: {})",
                sub.getId(), sub.getJudgeJobId(), prevStatus, sub.getCreatedAt());
            recoveredCount++;
        }

        log.info("Submission recovery completed: recovered {} stale submission(s)", recoveredCount);
        return recoveredCount;
    }
}
