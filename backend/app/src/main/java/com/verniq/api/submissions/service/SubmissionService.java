package com.verniq.api.submissions.service;

import com.verniq.api.common.exception.ConflictException;
import com.verniq.api.common.exception.InvalidRequestException;
import com.verniq.api.common.exception.ResourceNotFoundException;
import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.domain.SubmissionLanguage;
import com.verniq.api.submissions.domain.SubmissionStatus;
import com.verniq.api.submissions.dto.CreateSubmissionRequest;
import com.verniq.api.submissions.dto.JudgeResultCallbackRequest;
import com.verniq.api.submissions.dto.SubmissionDetailDto;
import com.verniq.api.submissions.dto.SubmissionResponseDto;
import com.verniq.api.submissions.metrics.SubmissionMetrics;
import com.verniq.api.submissions.queue.JudgeJobPayload;
import com.verniq.api.submissions.queue.SubmissionQueueProducer;
import com.verniq.api.submissions.repository.SubmissionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Service managing user submissions, pipeline validation, queue dispatch,
 * rate limiting, and result ingestion from the isolated judge worker.
 */
@Service
public class SubmissionService {

    private static final Logger log = LoggerFactory.getLogger(SubmissionService.class);
    private static final Pattern VERNIQ_ID_PATTERN = Pattern.compile("^VRQ-[0-9]{4,8}$", Pattern.CASE_INSENSITIVE);
    private static final int DEFAULT_TIME_LIMIT_MS = 2000;
    private static final int DEFAULT_MEMORY_LIMIT_MB = 256;

    @org.springframework.beans.factory.annotation.Value("${verniq.judge.default-time-limit-ms:2000}")
    private int defaultTimeLimitMs = DEFAULT_TIME_LIMIT_MS;

    @org.springframework.beans.factory.annotation.Value("${verniq.judge.default-memory-limit-mb:256}")
    private int defaultMemoryLimitMb = DEFAULT_MEMORY_LIMIT_MB;

    private final SubmissionRepository submissionRepository;
    private final ProblemRepository problemRepository;
    private final SubmissionQueueProducer queueProducer;
    private final com.verniq.api.progress.service.UserProgressService userProgressService;
    private final SubmissionRateLimiter rateLimiter;
    private final SubmissionMetrics submissionMetrics;

    public SubmissionService(SubmissionRepository submissionRepository,
                             ProblemRepository problemRepository,
                             SubmissionQueueProducer queueProducer,
                             com.verniq.api.progress.service.UserProgressService userProgressService,
                             SubmissionRateLimiter rateLimiter,
                             SubmissionMetrics submissionMetrics) {
        this.submissionRepository = submissionRepository;
        this.problemRepository = problemRepository;
        this.queueProducer = queueProducer;
        this.userProgressService = userProgressService;
        this.rateLimiter = rateLimiter;
        this.submissionMetrics = submissionMetrics;
    }

    @Transactional
    public SubmissionResponseDto createSubmission(UUID userId, CreateSubmissionRequest request) {
        if (userId == null) {
            throw new InvalidRequestException("Authenticated user ID is required");
        }

        // 1. Rate limiting check (protect judge worker from abuse)
        try {
            rateLimiter.checkLimit(userId);
        } catch (Exception e) {
            submissionMetrics.recordRateLimitHit();
            throw e;
        }

        // 2. Validate execution mode (RUN vs SUBMIT)
        String rawMode = request.mode();
        String mode = (rawMode != null && !rawMode.isBlank()) ? rawMode.toUpperCase().trim() : "SUBMIT";
        if (!"RUN".equals(mode) && !"SUBMIT".equals(mode)) {
            throw new InvalidRequestException("Invalid execution mode '" + rawMode + "'. Supported modes are RUN and SUBMIT.");
        }
        boolean isRunMode = "RUN".equals(mode);

        // 3. Resolve and validate published problem
        Problem problem = resolvePublishedProblem(request.problemId());

        // 4. Validate language support
        SubmissionLanguage language = SubmissionLanguage.from(request.language());

        // 5. Validate source code presence
        if (!StringUtils.hasText(request.sourceCode())) {
            throw new InvalidRequestException("Source code cannot be blank");
        }

        // 6. Create initial submission record with server-authoritative parameters
        Submission submission = new Submission();
        submission.setUserId(userId);
        submission.setProblem(problem);
        submission.setProblemVersion(problem.getCurrentVersion());
        submission.setLanguage(language.getDbValue());
        submission.setSourceCode(request.sourceCode());
        submission.setStatus(SubmissionStatus.QUEUED);
        submission.setQueuedAt(Instant.now());
        submission.setCustomRun(isRunMode);
        submission.setStdinInput(isRunMode ? request.customInput() : null);

        String judgeJobId = UUID.randomUUID().toString();
        submission.setJudgeJobId(judgeJobId);

        submission = submissionRepository.save(submission);

        try {
            MDC.put("submissionId", submission.getId().toString());
            MDC.put("judgeJobId", judgeJobId);

            log.info("SUBMISSION_CREATED submissionId={} judgeJobId={} problemVerniqId={} language={} mode={} version={}",
                submission.getId(), judgeJobId, problem.getVerniqId(), language.getDbValue(), mode, problem.getCurrentVersion());

            // 7. Enqueue to Redis queue for isolated execution worker (J.5.1 contract)
            JudgeJobPayload job = JudgeJobPayload.of(
                judgeJobId,
                submission.getId().toString(),
                problem.getId().toString(),
                problem.getVerniqId(),
                problem.getCurrentVersion(),
                language.getDbValue(),
                request.sourceCode(),
                mode,
                defaultTimeLimitMs,
                defaultMemoryLimitMb,
                isRunMode ? request.customInput() : null
            );

            queueProducer.enqueue(job);
            log.info("SUBMISSION_QUEUED submissionId={} judgeJobId={} problemVerniqId={} queueKey={}",
                submission.getId(), judgeJobId, problem.getVerniqId(), queueProducer.getQueueName());
            submissionMetrics.recordSubmissionCreated(language.getDbValue());
        } finally {
            MDC.remove("submissionId");
            MDC.remove("judgeJobId");
        }

        return new SubmissionResponseDto(
            submission.getId(),
            problem.getVerniqId(),
            language.name(),
            SubmissionStatus.QUEUED,
            submission.getQueuedAt()
        );
    }

    /**
     * Retries publishing an existing submission to the Redis queue.
     * Reuses the existing judgeJobId to guarantee idempotency across publication retries.
     */
    @Transactional
    public void republishSubmission(UUID submissionId) {
        Submission submission = submissionRepository.findById(submissionId)
            .orElseThrow(() -> new ResourceNotFoundException("Submission", submissionId.toString()));

        String existingJobId = submission.getJudgeJobId();
        if (!StringUtils.hasText(existingJobId)) {
            existingJobId = UUID.randomUUID().toString();
            submission.setJudgeJobId(existingJobId);
            submissionRepository.save(submission);
        }

        Problem problem = submission.getProblem();
        String mode = submission.isCustomRun() ? "RUN" : "SUBMIT";

        JudgeJobPayload job = JudgeJobPayload.of(
            existingJobId,
            submission.getId().toString(),
            problem != null ? problem.getId().toString() : null,
            problem != null ? problem.getVerniqId() : null,
            submission.getProblemVersion(),
            submission.getLanguage(),
            submission.getSourceCode(),
            mode,
            defaultTimeLimitMs,
            defaultMemoryLimitMb,
            submission.isCustomRun() ? submission.getStdinInput() : null
        );

        queueProducer.enqueue(job);
        log.info("Republished submission {} to Redis queue with stable jobId {}", submissionId, existingJobId);
    }

    @Transactional(readOnly = true)
    public SubmissionDetailDto getSubmissionForUser(UUID submissionId, UUID userId) {
        Submission submission = submissionRepository.findById(submissionId)
            .orElseThrow(() -> new ResourceNotFoundException("Submission", submissionId.toString()));

        // Security boundary: Strict user isolation (User A cannot access User B's submissions)
        if (!submission.getUserId().equals(userId)) {
            log.warn("Access denied: User {} attempted to view submission {} owned by {}",
                userId, submissionId, submission.getUserId());
            throw new ResourceNotFoundException("Submission", submissionId.toString());
        }

        return toDetailDto(submission);
    }

    @Transactional(readOnly = true)
    public Page<SubmissionDetailDto> listUserSubmissions(UUID userId, String problemIdentifier, Pageable pageable) {
        if (StringUtils.hasText(problemIdentifier)) {
            Optional<Problem> optionalProblem = findProblemByIdentifier(problemIdentifier);
            if (optionalProblem.isPresent()) {
                return submissionRepository.findByUserIdAndProblemIdOrderByCreatedAtDesc(
                    userId, optionalProblem.get().getId(), pageable
                ).map(this::toDetailDto);
            }
        }

        return submissionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
            .map(this::toDetailDto);
    }

    @Transactional
    public SubmissionDetailDto ingestJudgeResult(JudgeResultCallbackRequest callback) {
        if (callback == null) {
            throw new InvalidRequestException("Callback request cannot be null");
        }

        // Validate contract version
        if (callback.contractVersion() == null || !"1".equals(callback.contractVersion().trim())) {
            throw new InvalidRequestException("Invalid or unsupported contract version: expected '1', got '" + callback.contractVersion() + "'");
        }

        // Validate required fields
        if (callback.jobId() == null || callback.jobId().isBlank()) {
            throw new InvalidRequestException("jobId cannot be blank");
        }
        if (callback.submissionId() == null) {
            throw new InvalidRequestException("submissionId cannot be null");
        }
        if (callback.verdict() == null || callback.verdict().isBlank()) {
            throw new InvalidRequestException("verdict cannot be blank");
        }

        // Validate verdict enum
        SubmissionStatus finalStatus;
        try {
            finalStatus = SubmissionStatus.valueOf(callback.verdict().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            finalStatus = SubmissionStatus.fromDbVerdict(callback.verdict());
            if (finalStatus == SubmissionStatus.INTERNAL_ERROR
                    && !callback.verdict().equalsIgnoreCase("INTERNAL_ERROR")
                    && !callback.verdict().equalsIgnoreCase("system_error")) {
                throw new InvalidRequestException("Invalid verdict: '" + callback.verdict() + "'");
            }
        }

        // Validate numeric ranges
        if (callback.runtimeMs() != null && callback.runtimeMs() < 0) {
            throw new InvalidRequestException("runtimeMs cannot be negative: " + callback.runtimeMs());
        }
        if (callback.memoryKb() != null && callback.memoryKb() < 0) {
            throw new InvalidRequestException("memoryKb cannot be negative: " + callback.memoryKb());
        }
        if (callback.testCasesPassed() != null && callback.testCasesPassed() < 0) {
            throw new InvalidRequestException("testCasesPassed cannot be negative: " + callback.testCasesPassed());
        }
        if (callback.totalTestCases() != null && callback.totalTestCases() < 0) {
            throw new InvalidRequestException("totalTestCases cannot be negative: " + callback.totalTestCases());
        }
        if (callback.totalTestCases() != null && callback.testCasesPassed() != null) {
            if (callback.testCasesPassed() > callback.totalTestCases()) {
                throw new InvalidRequestException("Invalid test result: passedTests (" + callback.testCasesPassed() + ") cannot exceed totalTests (" + callback.totalTestCases() + ")");
            }
        }

        // Validate timestamp
        Instant parsedCompletedAt = null;
        if (callback.completedAt() != null && !callback.completedAt().isBlank()) {
            try {
                parsedCompletedAt = Instant.parse(callback.completedAt().trim());
            } catch (DateTimeParseException e) {
                throw new InvalidRequestException("Invalid completedAt timestamp format: " + callback.completedAt());
            }
        }

        Submission submission = submissionRepository.findById(callback.submissionId())
            .orElseThrow(() -> new ResourceNotFoundException("Submission", callback.submissionId().toString()));

        // Validate job identity (prevent stale or mismatched jobs from updating submission)
        if (submission.getJudgeJobId() != null && !submission.getJudgeJobId().isBlank()) {
            if (!submission.getJudgeJobId().equals(callback.jobId())) {
                log.warn("SUBMISSION_CALLBACK_REJECTED reason=job_id_mismatch submissionId={} expectedJobId={} reportedJobId={}",
                    submission.getId(), submission.getJudgeJobId(), callback.jobId());
                throw new ConflictException("Job ID mismatch: submission is linked to job '"
                    + submission.getJudgeJobId() + "' but callback reported job '" + callback.jobId() + "'");
            }
        } else {
            submission.setJudgeJobId(callback.jobId());
        }

        // Idempotency check: if already in terminal state
        if (submission.getStatus().isTerminal()) {
            if (submission.getStatus() == finalStatus) {
                log.info("SUBMISSION_CALLBACK_IDEMPOTENT submissionId={} judgeJobId={} verdict={}",
                    submission.getId(), callback.jobId(), finalStatus);
                return toDetailDto(submission);
            } else {
                log.warn("SUBMISSION_CALLBACK_REJECTED reason=conflict submissionId={} judgeJobId={} currentStatus={} requestedVerdict={}",
                    submission.getId(), callback.jobId(), submission.getStatus(), finalStatus);
                throw new ConflictException("Conflicting callback verdict: submission is already in terminal state "
                    + submission.getStatus() + " and cannot be updated to " + finalStatus);
            }
        }

        // Validate state transition
        if (!submission.getStatus().canTransitionTo(finalStatus)) {
            log.warn("SUBMISSION_CALLBACK_REJECTED reason=invalid_transition submissionId={} judgeJobId={} currentStatus={} requestedVerdict={}",
                submission.getId(), callback.jobId(), submission.getStatus(), finalStatus);
            throw new ConflictException("Invalid state transition from " + submission.getStatus() + " to " + finalStatus);
        }

        try {
            MDC.put("submissionId", submission.getId().toString());
            MDC.put("judgeJobId", submission.getJudgeJobId());

            log.info("Ingesting judge result for submission {} (status: {} -> {}, passed: {}/{})",
                submission.getId(), submission.getStatus(), finalStatus,
                callback.testCasesPassed(), callback.totalTestCases());

            Integer failedIndex = callback.failedTestIndex();
            String errorMsg = callback.errorMessage();
            if (callback.firstFailedTest() != null) {
                if (failedIndex == null) {
                    failedIndex = callback.firstFailedTest().testNumber();
                }
                if (errorMsg == null || errorMsg.isBlank()) {
                    errorMsg = callback.firstFailedTest().errorMessage();
                }
            }

            submission.markComplete(
                finalStatus,
                callback.runtimeMs(),
                callback.memoryKb(),
                callback.testCasesPassed(),
                callback.totalTestCases(),
                failedIndex,
                callback.compileOutput(),
                callback.stderrOutput(),
                callback.stdoutOutput(),
                errorMsg
            );

            if (parsedCompletedAt != null) {
                submission.setCompletedAt(parsedCompletedAt);
            }

            submission = submissionRepository.save(submission);

            // Record metrics
            submissionMetrics.recordSubmissionVerdict(
                submission.getLanguage(),
                finalStatus.name(),
                callback.runtimeMs() != null ? callback.runtimeMs().longValue() : 0L
            );

            // Atomic progress update for terminal status
            if (finalStatus.isTerminal()) {
                userProgressService.recordSubmissionResult(submission);
            }

            log.info("SUBMISSION_COMPLETED submissionId={} judgeJobId={} problemVerniqId={} verdict={} passed={}/{} runtimeMs={} memoryKb={}",
                submission.getId(), submission.getJudgeJobId(), submission.getProblem().getVerniqId(), finalStatus,
                callback.testCasesPassed(), callback.totalTestCases(), callback.runtimeMs(), callback.memoryKb());
        } finally {
            MDC.remove("submissionId");
            MDC.remove("judgeJobId");
        }

        return toDetailDto(submission);
    }

    private Problem resolvePublishedProblem(String identifier) {
        if (!StringUtils.hasText(identifier)) {
            throw new InvalidRequestException("Problem identifier cannot be empty");
        }

        Problem problem = findProblemByIdentifier(identifier)
            .orElseThrow(() -> new ResourceNotFoundException("Problem", identifier));

        if (!problem.isPublished()) {
            throw new InvalidRequestException("Submissions are only permitted for PUBLISHED problems");
        }

        return problem;
    }

    private Optional<Problem> findProblemByIdentifier(String identifier) {
        String trimmed = identifier.trim();
        if (VERNIQ_ID_PATTERN.matcher(trimmed).matches()) {
            return problemRepository.findByVerniqId(trimmed.toUpperCase(Locale.ROOT));
        }

        try {
            UUID uuid = UUID.fromString(trimmed);
            Optional<Problem> byId = problemRepository.findById(uuid);
            if (byId.isPresent()) {
                return byId;
            }
        } catch (IllegalArgumentException ignored) {
            // Not a UUID
        }

        return problemRepository.findBySlug(trimmed.toLowerCase(Locale.ROOT));
    }

    private SubmissionDetailDto toDetailDto(Submission sub) {
        String problemVerniqId = sub.getProblem() != null ? sub.getProblem().getVerniqId() : null;
        String problemTitle = sub.getProblem() != null ? sub.getProblem().getTitle() : null;

        return new SubmissionDetailDto(
            sub.getId(),
            problemVerniqId,
            problemTitle,
            sub.getLanguage(),
            sub.getStatus(),
            sub.getVerdict(),
            sub.getScore(),
            sub.getRuntimeMs(),
            sub.getMemoryKb(),
            sub.getTestCasesPassed(),
            sub.getTotalTestCases(),
            sub.getFailedTestIndex(),
            sub.getCompileOutput(),
            sub.getStderrOutput(),
            sub.getStdoutOutput(),
            sub.getErrorMessage(),
            sub.getProblemVersion(),
            sub.getCreatedAt(),
            sub.getQueuedAt(),
            sub.getStartedAt(),
            sub.getCompletedAt()
        );
    }
}
