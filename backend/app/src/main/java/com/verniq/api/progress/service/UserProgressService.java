package com.verniq.api.progress.service;

import com.verniq.api.common.exception.InvalidRequestException;
import com.verniq.api.common.exception.ResourceNotFoundException;
import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.domain.ProblemDifficulty;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.progress.domain.ProgressStatus;
import com.verniq.api.progress.domain.UserProblemProgress;
import com.verniq.api.progress.dto.*;
import com.verniq.api.progress.repository.UserProblemProgressRepository;
import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.domain.SubmissionStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class UserProgressService {

    private static final Logger log = LoggerFactory.getLogger(UserProgressService.class);
    private static final Pattern VERNIQ_ID_PATTERN = Pattern.compile("^VRQ-\\d{6}$", Pattern.CASE_INSENSITIVE);

    private final UserProblemProgressRepository progressRepository;
    private final ProblemRepository problemRepository;

    public UserProgressService(UserProblemProgressRepository progressRepository,
                               ProblemRepository problemRepository) {
        this.progressRepository = progressRepository;
        this.problemRepository = problemRepository;
    }

    /**
     * Idempotently records an authoritative problem attempt / solved transition from a verified submission.
     */
    @Transactional
    public void recordSubmissionResult(Submission submission) {
        if (submission == null || submission.getUserId() == null || submission.getProblem() == null) {
            log.warn("Cannot record progress: submission or references are null");
            return;
        }

        // Custom sandbox runs (test runs with custom input) do not count toward official problem progress
        if (submission.isCustomRun()) {
            return;
        }

        UUID userId = submission.getUserId();
        Problem problem = submission.getProblem();
        SubmissionStatus verdict = submission.getStatus();
        Instant submissionTime = submission.getCreatedAt() != null ? submission.getCreatedAt() : Instant.now();

        UserProblemProgress progress = progressRepository.findByUserIdAndProblemId(userId, problem.getId())
            .orElseGet(() -> {
                UserProblemProgress newProgress = new UserProblemProgress(userId, problem);
                newProgress.setFirstAttemptedAt(submissionTime);
                return newProgress;
            });

        if (progress.getFirstAttemptedAt() == null) {
            progress.setFirstAttemptedAt(submissionTime);
        }
        progress.setLastAttemptedAt(submissionTime);
        progress.setAttemptCount(progress.getAttemptCount() + 1);

        if (verdict == SubmissionStatus.ACCEPTED) {
            progress.setStatus(ProgressStatus.SOLVED.getDbValue());
            if (progress.getFirstSolvedAt() == null) {
                progress.setFirstSolvedAt(submissionTime);
            }
            progress.setLastSolvedAt(submissionTime);
            progress.setAcceptedSubmissionId(submission.getId());
            log.info("User {} SOLVED problem {} on submission {}", userId, problem.getVerniqId(), submission.getId());
        } else {
            // For non-accepted terminal verdicts, if already solved, preserve SOLVED state!
            if (!ProgressStatus.SOLVED.getDbValue().equalsIgnoreCase(progress.getStatus())) {
                progress.setStatus(ProgressStatus.ATTEMPTED.getDbValue());
            }
            log.info("User {} ATTEMPTED problem {} on submission {} (verdict: {})",
                userId, problem.getVerniqId(), submission.getId(), verdict);
        }

        progress.setUpdatedAt(Instant.now());
        progressRepository.save(progress);
    }

    /**
     * Returns progress for a specific problem.
     */
    @Transactional(readOnly = true)
    public ProblemProgressDto getProblemProgress(UUID userId, String problemIdentifier) {
        if (userId == null) {
            throw new InvalidRequestException("User ID is required");
        }
        Problem problem = resolveProblem(problemIdentifier);

        return progressRepository.findByUserIdAndProblemId(userId, problem.getId())
            .map(p -> new ProblemProgressDto(
                problem.getId(),
                problem.getVerniqId(),
                problem.getTitle(),
                ProgressStatus.fromDb(p.getStatus()).name(),
                p.getAttemptCount(),
                p.getFirstAttemptedAt(),
                p.getLastAttemptedAt(),
                p.getFirstSolvedAt(),
                p.getLastSolvedAt(),
                p.getAcceptedSubmissionId()
            ))
            .orElseGet(() -> new ProblemProgressDto(
                problem.getId(),
                problem.getVerniqId(),
                problem.getTitle(),
                ProgressStatus.UNATTEMPTED.name(),
                0,
                null,
                null,
                null,
                null,
                null
            ));
    }

    /**
     * Returns a fast status lookup map for catalog decoration (verniqId & UUID -> status string).
     */
    @Transactional(readOnly = true)
    public Map<String, String> getUserProblemStatusMap(UUID userId) {
        if (userId == null) {
            return Collections.emptyMap();
        }

        List<UserProblemProgress> list = progressRepository.findByUserId(userId);
        Map<String, String> map = new HashMap<>();

        for (UserProblemProgress p : list) {
            String status = ProgressStatus.fromDb(p.getStatus()).name();
            if (p.getProblem() != null) {
                if (p.getProblem().getVerniqId() != null) {
                    map.put(p.getProblem().getVerniqId(), status);
                }
                map.put(p.getProblem().getId().toString(), status);
            }
        }

        return map;
    }

    /**
     * Returns aggregated progress statistics for the dashboard.
     */
    @Transactional(readOnly = true)
    public ProgressSummaryDto getProgressSummary(UUID userId) {
        if (userId == null) {
            throw new InvalidRequestException("User ID is required");
        }

        // 1. Problem Totals
        long totalSolved = 0;
        long totalAttempted = 0;
        List<Object[]> problemTotals = progressRepository.countProblemProgressTotalsForUser(userId);
        if (!problemTotals.isEmpty() && problemTotals.get(0) != null) {
            Object[] row = problemTotals.get(0);
            totalSolved = row[0] != null ? ((Number) row[0]).longValue() : 0;
            totalAttempted = row[1] != null ? ((Number) row[1]).longValue() : 0;
        }

        // 2. Submission Totals & Acceptance Rate
        long totalSubmissions = 0;
        long acceptedSubmissions = 0;
        List<Object[]> subStats = progressRepository.countSubmissionStatsForUser(userId);
        if (!subStats.isEmpty() && subStats.get(0) != null) {
            Object[] row = subStats.get(0);
            totalSubmissions = row[0] != null ? ((Number) row[0]).longValue() : 0;
            acceptedSubmissions = row[1] != null ? ((Number) row[1]).longValue() : 0;
        }

        double submissionAcceptanceRate = totalSubmissions > 0
            ? Math.round(((double) acceptedSubmissions / totalSubmissions) * 1000.0) / 10.0
            : 0.0;

        // 3. Difficulty Progress
        Map<String, Long> totalPerDiff = new HashMap<>();
        for (Object[] row : progressRepository.countPublishedProblemsByDifficulty()) {
            if (row != null && row.length >= 2 && row[0] != null) {
                totalPerDiff.put(row[0].toString().toLowerCase(Locale.ROOT), ((Number) row[1]).longValue());
            }
        }

        Map<String, Long> solvedPerDiff = new HashMap<>();
        Map<String, Long> attemptedPerDiff = new HashMap<>();
        for (Object[] row : progressRepository.countUserProgressByDifficulty(userId)) {
            if (row != null && row.length >= 3 && row[0] != null) {
                String diff = row[0].toString().toLowerCase(Locale.ROOT);
                solvedPerDiff.put(diff, row[1] != null ? ((Number) row[1]).longValue() : 0L);
                attemptedPerDiff.put(diff, row[2] != null ? ((Number) row[2]).longValue() : 0L);
            }
        }

        long easySolved = solvedPerDiff.getOrDefault("easy", 0L);
        long mediumSolved = solvedPerDiff.getOrDefault("medium", 0L);
        long hardSolved = solvedPerDiff.getOrDefault("hard", 0L);

        DifficultyProgressDto difficultyDto = new DifficultyProgressDto(
            new DifficultyProgressItemDto(easySolved, attemptedPerDiff.getOrDefault("easy", 0L), totalPerDiff.getOrDefault("easy", 0L)),
            new DifficultyProgressItemDto(mediumSolved, attemptedPerDiff.getOrDefault("medium", 0L), totalPerDiff.getOrDefault("medium", 0L)),
            new DifficultyProgressItemDto(hardSolved, attemptedPerDiff.getOrDefault("hard", 0L), totalPerDiff.getOrDefault("hard", 0L))
        );

        // 4. Topic Progress
        List<TopicProgressDto> topicList = new ArrayList<>();
        for (Object[] row : progressRepository.aggregateTopicProgressForUser(userId)) {
            if (row != null && row.length >= 5) {
                String slug = (String) row[0];
                String name = (String) row[1];
                long total = row[2] != null ? ((Number) row[2]).longValue() : 0;
                long solved = row[3] != null ? ((Number) row[3]).longValue() : 0;
                long attempted = row[4] != null ? ((Number) row[4]).longValue() : 0;
                topicList.add(new TopicProgressDto(slug, name, solved, attempted, total));
            }
        }

        // 5. Company Progress
        List<CompanyProgressDto> companyList = new ArrayList<>();
        for (Object[] row : progressRepository.aggregateCompanyProgressForUser(userId)) {
            if (row != null && row.length >= 5) {
                String slug = (String) row[0];
                String name = (String) row[1];
                long total = row[2] != null ? ((Number) row[2]).longValue() : 0;
                long solved = row[3] != null ? ((Number) row[3]).longValue() : 0;
                long attempted = row[4] != null ? ((Number) row[4]).longValue() : 0;
                companyList.add(new CompanyProgressDto(slug, name, solved, attempted, total));
            }
        }

        // 6. Recent Activity
        List<RecentActivityDto> recentActivities = new ArrayList<>();
        List<UserProblemProgress> recentList = progressRepository.findRecentActivityForUser(userId, PageRequest.of(0, 10));
        for (UserProblemProgress p : recentList) {
            if (p.getProblem() != null) {
                recentActivities.add(new RecentActivityDto(
                    p.getProblem().getId(),
                    p.getProblem().getVerniqId(),
                    p.getProblem().getTitle(),
                    p.getProblem().getDifficulty() != null ? p.getProblem().getDifficulty().name() : "MEDIUM",
                    ProgressStatus.fromDb(p.getStatus()).name(),
                    p.getLastAttemptedAt()
                ));
            }
        }

        return new ProgressSummaryDto(
            totalAttempted,
            totalSolved,
            easySolved,
            mediumSolved,
            hardSolved,
            totalSubmissions,
            acceptedSubmissions,
            submissionAcceptanceRate,
            difficultyDto,
            topicList,
            companyList,
            recentActivities
        );
    }

    private Problem resolveProblem(String identifier) {
        if (!StringUtils.hasText(identifier)) {
            throw new InvalidRequestException("Problem identifier cannot be empty");
        }
        String trimmed = identifier.trim();
        if (VERNIQ_ID_PATTERN.matcher(trimmed).matches()) {
            return problemRepository.findByVerniqId(trimmed.toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResourceNotFoundException("Problem", trimmed));
        }
        try {
            UUID uuid = UUID.fromString(trimmed);
            Optional<Problem> byId = problemRepository.findById(uuid);
            if (byId.isPresent()) {
                return byId.get();
            }
        } catch (IllegalArgumentException ignored) {
            // Not a UUID
        }
        return problemRepository.findBySlug(trimmed.toLowerCase(Locale.ROOT))
            .orElseThrow(() -> new ResourceNotFoundException("Problem", trimmed));
    }
}
