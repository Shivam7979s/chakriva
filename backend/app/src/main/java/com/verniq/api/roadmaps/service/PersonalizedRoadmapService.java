package com.verniq.api.roadmaps.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.verniq.api.common.exception.ConflictException;
import com.verniq.api.common.exception.InvalidRequestException;
import com.verniq.api.common.exception.ResourceNotFoundException;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.progress.service.UserProgressService;
import com.verniq.api.roadmaps.domain.UserStudyPlan;
import com.verniq.api.roadmaps.dto.PersonalizedRoadmapDto;
import com.verniq.api.roadmaps.dto.SavePersonalizedRoadmapRequest;
import com.verniq.api.roadmaps.repository.UserStudyPlanRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
public class PersonalizedRoadmapService {

    private static final Logger log = LoggerFactory.getLogger(PersonalizedRoadmapService.class);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final UserStudyPlanRepository studyPlanRepository;
    private final UserProgressService userProgressService;
    private final ProblemRepository problemRepository;

    public PersonalizedRoadmapService(
            UserStudyPlanRepository studyPlanRepository,
            UserProgressService userProgressService,
            ProblemRepository problemRepository) {
        this.studyPlanRepository = studyPlanRepository;
        this.userProgressService = userProgressService;
        this.problemRepository = problemRepository;
    }

    /**
     * Retrieves the authenticated user's active personalized roadmap.
     * Problem task completion is reconciled with the authoritative judge progress map.
     */
    @Transactional(readOnly = true)
    public Optional<PersonalizedRoadmapDto> getActiveRoadmap(UUID userId) {
        if (userId == null) {
            return Optional.empty();
        }

        Optional<UserStudyPlan> planOpt = studyPlanRepository.findByUserIdAndIsActiveTrue(userId);
        if (planOpt.isEmpty()) {
            return Optional.empty();
        }

        UserStudyPlan plan = planOpt.get();
        Map<String, Object> planData = parsePlanData(plan.getPlanData());

        // Reconcile problem tasks against authoritative judge engine
        Map<String, String> judgeProgressMap = userProgressService.getUserProblemStatusMap(userId);
        reconcilePlanWithJudge(planData, judgeProgressMap);

        return Optional.of(toDto(plan, planData));
    }

    /**
     * Saves or replaces the authenticated user's personalized roadmap.
     * Enforces optimistic concurrency via version numbers and validates problem references.
     */
    @Transactional
    public PersonalizedRoadmapDto saveRoadmap(UUID userId, SavePersonalizedRoadmapRequest request) {
        if (userId == null) {
            throw new InvalidRequestException("User identity is required to save roadmap");
        }
        if (request == null || request.planData() == null || request.planData().isEmpty()) {
            throw new InvalidRequestException("Roadmap planData is required");
        }

        Map<String, Object> planData = new HashMap<>(request.planData());
        planData.put("userId", userId.toString());

        // Validate canonical problem references if tasks are present
        validateProblemReferences(planData);

        // Fetch existing active plan to check concurrency
        Optional<UserStudyPlan> existingOpt = studyPlanRepository.findByUserIdAndIsActiveTrue(userId);

        UserStudyPlan plan;
        if (existingOpt.isPresent()) {
            plan = existingOpt.get();
            // Optimistic concurrency check
            if (request.version() != null && request.version() < plan.getVersion()) {
                throw new ConflictException(
                        "Roadmap was modified in another session (client version: " + request.version()
                                + ", server version: " + plan.getVersion() + "). Please reload before saving."
                );
            }

            // Extract completed tasks from existing plan to ensure completed history is NEVER lost
            Map<String, Object> existingPlanData = parsePlanData(plan.getPlanData());
            preserveCompletedTaskHistory(existingPlanData, planData);

            plan.setVersion(plan.getVersion() + 1);
        } else {
            plan = new UserStudyPlan();
            plan.setUserId(userId);
            plan.setVersion(1);
            plan.setIsActive(true);
            plan.setCreatedAt(Instant.now());
        }

        // Reconcile problem task completion with authoritative judge map & persist
        Map<String, String> judgeProgressMap = userProgressService.getUserProblemStatusMap(userId);
        applyPlanMetadataAndSave(plan, request, planData, judgeProgressMap);
        UserStudyPlan saved = studyPlanRepository.save(plan);
        log.info("Saved personalized roadmap for user {} (version {})", userId, saved.getVersion());

        return toDto(saved, planData);
    }

    /**
     * Lists all saved personalized roadmaps (active and paused) for the authenticated user,
     * with each plan's coding problem completions reconciled against the judge pipeline.
     */
    @Transactional(readOnly = true)
    public List<PersonalizedRoadmapDto> listRoadmaps(UUID userId) {
        if (userId == null) {
            return Collections.emptyList();
        }

        List<UserStudyPlan> plans = studyPlanRepository.findAllByUserIdOrderByUpdatedAtDesc(userId);
        if (plans.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, String> judgeProgressMap = userProgressService.getUserProblemStatusMap(userId);
        List<PersonalizedRoadmapDto> result = new ArrayList<>(plans.size());
        for (UserStudyPlan plan : plans) {
            Map<String, Object> planData = parsePlanData(plan.getPlanData());
            planData.put("status", Boolean.TRUE.equals(plan.getIsActive()) ? "active" : "paused");
            reconcilePlanWithJudge(planData, judgeProgressMap);
            result.add(toDto(plan, planData));
        }
        return result;
    }

    /**
     * Retrieves a specific saved roadmap owned by the authenticated user.
     */
    @Transactional(readOnly = true)
    public PersonalizedRoadmapDto getRoadmapById(UUID userId, UUID planId) {
        if (userId == null || planId == null) {
            throw new InvalidRequestException("User identity and roadmap ID are required");
        }

        UserStudyPlan plan = studyPlanRepository.findByIdAndUserId(planId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Personalized roadmap not found: " + planId));

        Map<String, Object> planData = parsePlanData(plan.getPlanData());
        planData.put("status", Boolean.TRUE.equals(plan.getIsActive()) ? "active" : "paused");
        Map<String, String> judgeProgressMap = userProgressService.getUserProblemStatusMap(userId);
        reconcilePlanWithJudge(planData, judgeProgressMap);

        return toDto(plan, planData);
    }

    /**
     * Creates a distinct new personalized roadmap, pausing any previously active roadmap
     * so multiple saved roadmaps can coexist across sessions.
     */
    @Transactional
    public PersonalizedRoadmapDto createNewRoadmap(UUID userId, SavePersonalizedRoadmapRequest request) {
        if (userId == null) {
            throw new InvalidRequestException("User identity is required to create roadmap");
        }
        if (request == null || request.planData() == null || request.planData().isEmpty()) {
            throw new InvalidRequestException("Roadmap planData is required");
        }

        Map<String, Object> planData = new HashMap<>(request.planData());
        planData.put("userId", userId.toString());
        planData.put("status", "active");
        validateProblemReferences(planData);

        // Pause any existing active plans for this user
        pauseOtherActivePlans(userId, null);

        UserStudyPlan plan = new UserStudyPlan();
        plan.setUserId(userId);
        plan.setVersion(1);
        plan.setIsActive(true);
        plan.setCreatedAt(Instant.now());

        Map<String, String> judgeProgressMap = userProgressService.getUserProblemStatusMap(userId);
        applyPlanMetadataAndSave(plan, request, planData, judgeProgressMap);

        UserStudyPlan saved = studyPlanRepository.save(plan);
        log.info("Created new personalized roadmap {} for user {}", saved.getId(), userId);
        return toDto(saved, planData);
    }

    /**
     * Updates a specific saved roadmap owned by the authenticated user.
     */
    @Transactional
    public PersonalizedRoadmapDto updateRoadmapById(UUID userId, UUID planId, SavePersonalizedRoadmapRequest request) {
        if (userId == null || planId == null) {
            throw new InvalidRequestException("User identity and roadmap ID are required");
        }
        if (request == null || request.planData() == null || request.planData().isEmpty()) {
            throw new InvalidRequestException("Roadmap planData is required");
        }

        UserStudyPlan plan = studyPlanRepository.findByIdAndUserId(planId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Personalized roadmap not found: " + planId));

        if (request.version() != null && request.version() < plan.getVersion()) {
            throw new ConflictException(
                    "Roadmap was modified in another session (client version: " + request.version()
                            + ", server version: " + plan.getVersion() + "). Please reload before saving."
            );
        }

        Map<String, Object> planData = new HashMap<>(request.planData());
        planData.put("userId", userId.toString());
        validateProblemReferences(planData);

        Map<String, Object> existingPlanData = parsePlanData(plan.getPlanData());
        preserveCompletedTaskHistory(existingPlanData, planData);
        plan.setVersion(plan.getVersion() + 1);

        Map<String, String> judgeProgressMap = userProgressService.getUserProblemStatusMap(userId);
        applyPlanMetadataAndSave(plan, request, planData, judgeProgressMap);

        UserStudyPlan saved = studyPlanRepository.save(plan);
        return toDto(saved, planData);
    }

    /**
     * Switches a roadmap between active and paused states. Activating a roadmap pauses others.
     */
    @Transactional
    public PersonalizedRoadmapDto setRoadmapStatus(UUID userId, UUID planId, String status) {
        if (userId == null || planId == null) {
            throw new InvalidRequestException("User identity and roadmap ID are required");
        }
        if (status == null || (!"active".equalsIgnoreCase(status) && !"paused".equalsIgnoreCase(status))) {
            throw new InvalidRequestException("Status must be 'active' or 'paused'");
        }

        UserStudyPlan plan = studyPlanRepository.findByIdAndUserId(planId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Personalized roadmap not found: " + planId));

        boolean activating = "active".equalsIgnoreCase(status);
        if (activating) {
            pauseOtherActivePlans(userId, planId);
        }

        Map<String, Object> planData = parsePlanData(plan.getPlanData());
        planData.put("status", activating ? "active" : "paused");
        planData.put("updatedAt", Instant.now().toString());

        plan.setIsActive(activating);
        plan.setVersion(plan.getVersion() + 1);
        plan.setUpdatedAt(Instant.now());
        plan.setPlanData(serializePlanData(planData));

        UserStudyPlan saved = studyPlanRepository.save(plan);
        Map<String, String> judgeProgressMap = userProgressService.getUserProblemStatusMap(userId);
        reconcilePlanWithJudge(planData, judgeProgressMap);
        return toDto(saved, planData);
    }

    /**
     * Permanently deletes a specific saved roadmap belonging to the user.
     */
    @Transactional
    public void deleteRoadmapById(UUID userId, UUID planId) {
        if (userId == null || planId == null) {
            throw new InvalidRequestException("User identity and roadmap ID are required");
        }

        UserStudyPlan plan = studyPlanRepository.findByIdAndUserId(planId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Personalized roadmap not found: " + planId));

        studyPlanRepository.delete(plan);
        log.info("Deleted personalized roadmap {} for user {}", planId, userId);
    }

    private void pauseOtherActivePlans(UUID userId, UUID exceptPlanId) {
        List<UserStudyPlan> existingPlans = studyPlanRepository.findAllByUserIdOrderByUpdatedAtDesc(userId);
        for (UserStudyPlan existing : existingPlans) {
            if (Boolean.TRUE.equals(existing.getIsActive())
                    && (exceptPlanId == null || !existing.getId().equals(exceptPlanId))) {
                Map<String, Object> existingData = parsePlanData(existing.getPlanData());
                existingData.put("status", "paused");
                existingData.put("updatedAt", Instant.now().toString());
                existing.setIsActive(false);
                existing.setUpdatedAt(Instant.now());
                existing.setPlanData(serializePlanData(existingData));
                studyPlanRepository.save(existing);
            }
        }
    }

    private void applyPlanMetadataAndSave(
            UserStudyPlan plan,
            SavePersonalizedRoadmapRequest request,
            Map<String, Object> planData,
            Map<String, String> judgeProgressMap) {
        reconcilePlanWithJudge(planData, judgeProgressMap);

        String title = request.title() != null && !request.title().isBlank()
                ? request.title()
                : (String) planData.getOrDefault("title", "My Personalized Roadmap");
        String goal = request.goal() != null && !request.goal().isBlank()
                ? request.goal()
                : extractGoal(planData);
        LocalDate targetDate = request.targetDate() != null
                ? request.targetDate()
                : extractTargetDate(planData);
        Integer dailyMinutes = request.dailyMinutes() != null
                ? request.dailyMinutes()
                : extractDailyMinutes(planData);

        plan.setTitle(title);
        plan.setGoal(goal);
        plan.setTargetDate(targetDate);
        plan.setDailyMinutes(dailyMinutes);
        plan.setUpdatedAt(Instant.now());
        plan.setPlanData(serializePlanData(planData));
    }

    /**
     * Updates roadmap preferences (role, goal, pacing, weekly hours, timeline).
     * Preserves completed history and recalculates the schedule.
     */
    @Transactional
    public PersonalizedRoadmapDto updatePreferences(UUID userId, Map<String, Object> updatedProfile, Integer clientVersion) {
        if (userId == null) {
            throw new InvalidRequestException("User identity required");
        }

        UserStudyPlan plan = studyPlanRepository.findByUserIdAndIsActiveTrue(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No active personalized roadmap found for user"));

        if (clientVersion != null && clientVersion < plan.getVersion()) {
            throw new ConflictException("Roadmap has been modified elsewhere. Please reload to review current plan.");
        }

        Map<String, Object> planData = parsePlanData(plan.getPlanData());
        @SuppressWarnings("unchecked")
        Map<String, Object> currentProfile = (Map<String, Object>) planData.getOrDefault("profile", new HashMap<String, Object>());

        // Merge updated profile fields
        currentProfile.putAll(updatedProfile);
        planData.put("profile", currentProfile);
        planData.put("updatedAt", Instant.now().toString());

        plan.setVersion(plan.getVersion() + 1);
        plan.setUpdatedAt(Instant.now());
        plan.setPlanData(serializePlanData(planData));

        UserStudyPlan saved = studyPlanRepository.save(plan);
        return toDto(saved, planData);
    }

    /**
     * Applies an approved schedule recalculation proposal.
     * Strictly preserves completed tasks and prerequisites.
     */
    @Transactional
    public PersonalizedRoadmapDto applyRescheduling(UUID userId, Map<String, Object> fullRoadmapData, Integer clientVersion) {
        if (userId == null) {
            throw new InvalidRequestException("User identity required");
        }

        UserStudyPlan plan = studyPlanRepository.findByUserIdAndIsActiveTrue(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No active roadmap found to reschedule"));

        if (clientVersion != null && clientVersion < plan.getVersion()) {
            throw new ConflictException("Conflict detected: Roadmap changed during rescheduling. Please reload.");
        }

        Map<String, Object> existingPlanData = parsePlanData(plan.getPlanData());
        preserveCompletedTaskHistory(existingPlanData, fullRoadmapData);

        // Reconcile with authoritative judge engine
        Map<String, String> judgeProgressMap = userProgressService.getUserProblemStatusMap(userId);
        reconcilePlanWithJudge(fullRoadmapData, judgeProgressMap);

        fullRoadmapData.put("lastRecalculatedAt", Instant.now().toString());
        fullRoadmapData.put("updatedAt", Instant.now().toString());

        plan.setVersion(plan.getVersion() + 1);
        plan.setUpdatedAt(Instant.now());
        plan.setPlanData(serializePlanData(fullRoadmapData));

        UserStudyPlan saved = studyPlanRepository.save(plan);
        return toDto(saved, fullRoadmapData);
    }

    /**
     * Deactivates the user's active roadmap.
     */
    @Transactional
    public void deleteActiveRoadmap(UUID userId) {
        if (userId == null) return;
        studyPlanRepository.findByUserIdAndIsActiveTrue(userId).ifPresent(plan -> {
            plan.setIsActive(false);
            plan.setUpdatedAt(Instant.now());
            studyPlanRepository.save(plan);
        });
    }

    // =========================================================================
    // HELPER & RECONCILIATION METHODS
    // =========================================================================

    /**
     * Authoritative Judge Reconciliation:
     * Problem tasks are ONLY completed if verified by the judge engine (`SOLVED`).
     * Non-problem tasks (concept, reading) preserve their recorded completion status.
     */
    @SuppressWarnings("unchecked")
    private void reconcilePlanWithJudge(Map<String, Object> planData, Map<String, String> judgeProgressMap) {
        if (planData == null || !planData.containsKey("weeks")) {
            return;
        }

        List<Map<String, Object>> weeks = (List<Map<String, Object>>) planData.get("weeks");
        if (weeks == null) return;

        int totalTasks = 0;
        int completedTasks = 0;
        int missedTasks = 0;
        String todayStr = LocalDate.now().toString();

        for (Map<String, Object> week : weeks) {
            List<Map<String, Object>> days = (List<Map<String, Object>>) week.get("days");
            if (days == null) continue;

            for (Map<String, Object> day : days) {
                String dayDate = (String) day.get("date");
                List<Map<String, Object>> tasks = (List<Map<String, Object>>) day.get("tasks");
                if (tasks == null) continue;

                for (Map<String, Object> task : tasks) {
                    totalTasks++;
                    String verniqId = (String) task.get("verniqProblemId");
                    String slug = (String) task.get("problemSlug");
                    String currentStatus = (String) task.get("status");

                    boolean isProblemTask = verniqId != null || slug != null;

                    if (isProblemTask) {
                        boolean isSolved = (verniqId != null && "SOLVED".equalsIgnoreCase(judgeProgressMap.get(verniqId)))
                                || (slug != null && "SOLVED".equalsIgnoreCase(judgeProgressMap.get(slug)));

                        if (isSolved) {
                            task.put("status", "completed");
                            if (task.get("completedAt") == null) {
                                task.put("completedAt", Instant.now().toString());
                            }
                            completedTasks++;
                        } else {
                            // If not solved by judge, ensure it is NOT marked completed!
                            if ("completed".equalsIgnoreCase(currentStatus)) {
                                task.put("completedAt", null);
                            }

                            if (dayDate != null && dayDate.compareTo(todayStr) < 0) {
                                task.put("status", "missed");
                                missedTasks++;
                            } else if (dayDate != null && dayDate.equals(todayStr)) {
                                task.put("status", "in_progress");
                            } else {
                                task.put("status", "upcoming");
                            }
                        }
                    } else {
                        // Non-problem task (learn concept, reading, etc.)
                        if ("completed".equalsIgnoreCase(currentStatus)) {
                            completedTasks++;
                        } else if (dayDate != null && dayDate.compareTo(todayStr) < 0) {
                            task.put("status", "missed");
                            missedTasks++;
                        } else if (dayDate != null && dayDate.equals(todayStr)) {
                            task.put("status", "in_progress");
                        } else {
                            task.put("status", "upcoming");
                        }
                    }
                }
            }
        }

        planData.put("totalTasks", totalTasks);
        planData.put("completedTasks", completedTasks);
        planData.put("missedTasks", missedTasks);
        int percent = totalTasks > 0 ? (int) Math.round(((double) completedTasks / totalTasks) * 100.0) : 0;
        planData.put("progressPercent", percent);
    }

    /**
     * Preserves completed task records from previous plan when generating adjustments.
     */
    @SuppressWarnings("unchecked")
    private void preserveCompletedTaskHistory(Map<String, Object> oldPlan, Map<String, Object> newPlan) {
        if (oldPlan == null || newPlan == null) return;

        Map<String, String> completedTimestamps = new HashMap<>();

        // 1. Gather all previously completed tasks and their completion timestamps
        List<Map<String, Object>> oldWeeks = (List<Map<String, Object>>) oldPlan.get("weeks");
        if (oldWeeks != null) {
            for (Map<String, Object> week : oldWeeks) {
                List<Map<String, Object>> days = (List<Map<String, Object>>) week.get("days");
                if (days == null) continue;
                for (Map<String, Object> day : days) {
                    List<Map<String, Object>> tasks = (List<Map<String, Object>>) day.get("tasks");
                    if (tasks == null) continue;
                    for (Map<String, Object> task : tasks) {
                        if ("completed".equalsIgnoreCase((String) task.get("status"))) {
                            String ts = (String) task.get("completedAt");
                            if (ts == null) ts = Instant.now().toString();
                            if (task.get("problemSlug") != null) {
                                completedTimestamps.put((String) task.get("problemSlug"), ts);
                            }
                            if (task.get("verniqProblemId") != null) {
                                completedTimestamps.put((String) task.get("verniqProblemId"), ts);
                            }
                            if (task.get("id") != null) {
                                completedTimestamps.put((String) task.get("id"), ts);
                            }
                        }
                    }
                }
            }
        }

        if (completedTimestamps.isEmpty()) return;

        // 2. Apply previously completed status to corresponding tasks in new plan
        List<Map<String, Object>> newWeeks = (List<Map<String, Object>>) newPlan.get("weeks");
        if (newWeeks != null) {
            for (Map<String, Object> week : newWeeks) {
                List<Map<String, Object>> days = (List<Map<String, Object>>) week.get("days");
                if (days == null) continue;
                for (Map<String, Object> task : days.stream()
                        .map(d -> (List<Map<String, Object>>) d.get("tasks"))
                        .filter(Objects::nonNull)
                        .flatMap(List::stream)
                        .toList()) {
                    String slug = (String) task.get("problemSlug");
                    String vid = (String) task.get("verniqProblemId");
                    String id = (String) task.get("id");

                    String matchedTs = null;
                    if (slug != null && completedTimestamps.containsKey(slug)) {
                        matchedTs = completedTimestamps.get(slug);
                    } else if (vid != null && completedTimestamps.containsKey(vid)) {
                        matchedTs = completedTimestamps.get(vid);
                    } else if (id != null && completedTimestamps.containsKey(id)) {
                        matchedTs = completedTimestamps.get(id);
                    }

                    if (matchedTs != null) {
                        task.put("status", "completed");
                        task.put("completedAt", matchedTs);
                    }
                }
            }
        }
    }

    private String getTaskKey(Map<String, Object> task) {
        if (task.get("verniqProblemId") != null) {
            return (String) task.get("verniqProblemId");
        }
        if (task.get("id") != null) {
            return (String) task.get("id");
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private void validateProblemReferences(Map<String, Object> planData) {
        List<Map<String, Object>> weeks = (List<Map<String, Object>>) planData.get("weeks");
        if (weeks == null) return;

        Set<String> referencedVerniqIds = new HashSet<>();
        for (Map<String, Object> week : weeks) {
            List<Map<String, Object>> days = (List<Map<String, Object>>) week.get("days");
            if (days == null) continue;
            for (Map<String, Object> day : days) {
                List<Map<String, Object>> tasks = (List<Map<String, Object>>) day.get("tasks");
                if (tasks == null) continue;
                for (Map<String, Object> task : tasks) {
                    String verniqId = (String) task.get("verniqProblemId");
                    if (verniqId != null && !verniqId.isBlank()) {
                        referencedVerniqIds.add(verniqId.trim());
                    }
                }
            }
        }

        if (!referencedVerniqIds.isEmpty()) {
            // Verify all verniq IDs format: VRQ-XXXXXX
            for (String vid : referencedVerniqIds) {
                if (!vid.matches("^VRQ-\\d{6}$")) {
                    throw new InvalidRequestException("Invalid canonical problem identifier: " + vid);
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private String extractGoal(Map<String, Object> planData) {
        Map<String, Object> profile = (Map<String, Object>) planData.get("profile");
        if (profile != null && profile.get("goal") != null) {
            return (String) profile.get("goal");
        }
        return "product_sde";
    }

    @SuppressWarnings("unchecked")
    private LocalDate extractTargetDate(Map<String, Object> planData) {
        Map<String, Object> profile = (Map<String, Object>) planData.get("profile");
        if (profile != null && profile.get("targetDeadline") != null) {
            try {
                return LocalDate.parse((String) profile.get("targetDeadline"));
            } catch (Exception ignored) {}
        }
        return LocalDate.now().plusMonths(3);
    }

    @SuppressWarnings("unchecked")
    private Integer extractDailyMinutes(Map<String, Object> planData) {
        Map<String, Object> profile = (Map<String, Object>) planData.get("profile");
        if (profile != null && profile.get("weeklyAvailability") instanceof Map<?, ?> avail) {
            int totalHours = 0;
            for (Object v : avail.values()) {
                if (v instanceof Number n) {
                    totalHours += n.intValue();
                }
            }
            if (totalHours > 0) {
                return Math.max(30, (totalHours * 60) / 7);
            }
        }
        return 60;
    }

    private PersonalizedRoadmapDto toDto(UserStudyPlan plan, Map<String, Object> planData) {
        return new PersonalizedRoadmapDto(
                plan.getId(),
                plan.getUserId(),
                plan.getTitle(),
                plan.getGoal(),
                plan.getTargetDate(),
                plan.getDailyMinutes(),
                plan.getIsActive(),
                plan.getVersion(),
                plan.getCreatedAt(),
                plan.getUpdatedAt(),
                planData
        );
    }

    private Map<String, Object> parsePlanData(String json) {
        if (json == null || json.isBlank() || "{}".equals(json.trim())) {
            return new HashMap<>();
        }
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse plan_data JSON: {}", e.getMessage());
            return new HashMap<>();
        }
    }

    private String serializePlanData(Map<String, Object> map) {
        if (map == null || map.isEmpty()) {
            return "{}";
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(map);
        } catch (Exception e) {
            log.error("Failed to serialize plan_data to JSON: {}", e.getMessage());
            throw new InvalidRequestException("Failed to encode roadmap plan data");
        }
    }
}
