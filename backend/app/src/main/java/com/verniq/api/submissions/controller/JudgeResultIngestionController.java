package com.verniq.api.submissions.controller;

import com.verniq.api.common.response.ApiResponse;
import com.verniq.api.submissions.dto.JudgeResultCallbackRequest;
import com.verniq.api.submissions.dto.SubmissionDetailDto;
import com.verniq.api.submissions.service.SubmissionService;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

/**
 * Internal service-to-service callback endpoint for the Python judge worker.
 *
 * <p>Protected via constant-time shared secret header verification. Not accessible to regular users.</p>
 */
@RestController
@RequestMapping("/api/v1/internal/judge")
public class JudgeResultIngestionController {

    private static final Logger log = LoggerFactory.getLogger(JudgeResultIngestionController.class);
    public static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";

    private final SubmissionService submissionService;
    private final com.verniq.api.submissions.metrics.SubmissionMetrics submissionMetrics;
    private final String internalSecret;

    public JudgeResultIngestionController(
            SubmissionService submissionService,
            com.verniq.api.submissions.metrics.SubmissionMetrics submissionMetrics,
            @Value("${verniq.judge.internal-secret:${app.judge.internal-secret:}}") String internalSecret) {
        this.submissionService = submissionService;
        this.submissionMetrics = submissionMetrics;
        this.internalSecret = internalSecret != null ? internalSecret.trim() : "";
    }

    @PostMapping("/results")
    public ResponseEntity<ApiResponse<SubmissionDetailDto>> ingestResult(
            @RequestHeader(value = INTERNAL_SECRET_HEADER, required = false) String secretHeader,
            @Valid @RequestBody JudgeResultCallbackRequest callback) {

        // Validate service-to-service authentication using constant-time comparison
        if (secretHeader == null || secretHeader.isBlank() || internalSecret.isBlank() ||
                !MessageDigest.isEqual(secretHeader.trim().getBytes(StandardCharsets.UTF_8), internalSecret.getBytes(StandardCharsets.UTF_8))) {
            if (submissionMetrics != null) {
                submissionMetrics.recordCallbackRejected("UNAUTHORIZED_SECRET");
            }
            log.warn("SUBMISSION_CALLBACK_REJECTED reason=unauthorized_secret endpoint=/api/v1/internal/judge/results");
            throw new AccessDeniedException("Access denied: Invalid or missing internal judge secret");
        }

        if (submissionMetrics != null) {
            submissionMetrics.recordCallbackReceived(callback.verdict());
        }
        log.info("CALLBACK_RECEIVED submissionId={} judgeJobId={} verdict={}",
            callback.submissionId(), callback.jobId(), callback.verdict());

        SubmissionDetailDto updatedSubmission = submissionService.ingestJudgeResult(callback);
        return ResponseEntity.ok(ApiResponse.ok(updatedSubmission));
    }
}
