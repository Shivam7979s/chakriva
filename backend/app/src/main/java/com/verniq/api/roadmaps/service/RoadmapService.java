package com.verniq.api.roadmaps.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.verniq.api.common.exception.InvalidRequestException;
import com.verniq.api.common.exception.ResourceNotFoundException;
import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.progress.service.UserProgressService;
import com.verniq.api.roadmaps.domain.*;
import com.verniq.api.roadmaps.dto.*;
import com.verniq.api.roadmaps.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RoadmapService {

    private static final Logger log = LoggerFactory.getLogger(RoadmapService.class);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final RoadmapRepository roadmapRepository;
    private final RoadmapSprintRepository sprintRepository;
    private final RoadmapDayRepository dayRepository;
    private final RoadmapDayTopicRepository topicRepository;
    private final RoadmapItemRepository itemRepository;
    private final RoadmapProblemReferenceRepository problemRefRepository;
    private final UserRoadmapItemProgressRepository userItemProgressRepository;
    private final UserRoadmapProgressRepository userRoadmapProgressRepository;
    private final ProblemRepository problemRepository;
    private final UserProgressService userProgressService;

    public RoadmapService(RoadmapRepository roadmapRepository,
                          RoadmapSprintRepository sprintRepository,
                          RoadmapDayRepository dayRepository,
                          RoadmapDayTopicRepository topicRepository,
                          RoadmapItemRepository itemRepository,
                          RoadmapProblemReferenceRepository problemRefRepository,
                          UserRoadmapItemProgressRepository userItemProgressRepository,
                          UserRoadmapProgressRepository userRoadmapProgressRepository,
                          ProblemRepository problemRepository,
                          UserProgressService userProgressService) {
        this.roadmapRepository = roadmapRepository;
        this.sprintRepository = sprintRepository;
        this.dayRepository = dayRepository;
        this.topicRepository = topicRepository;
        this.itemRepository = itemRepository;
        this.problemRefRepository = problemRefRepository;
        this.userItemProgressRepository = userItemProgressRepository;
        this.userRoadmapProgressRepository = userRoadmapProgressRepository;
        this.problemRepository = problemRepository;
        this.userProgressService = userProgressService;
    }

    /**
     * Lists published roadmaps with high-level user progress.
     */
    @Transactional(readOnly = true)
    public List<RoadmapSummaryDto> getRoadmapsSummary(UUID userId) {
        List<Roadmap> roadmaps = roadmapRepository.findAllByIsPublishedTrueOrderByOrderIndexAsc();
        List<RoadmapSummaryDto> result = new ArrayList<>();

        for (Roadmap r : roadmaps) {
            RoadmapDetailDto detail = getRoadmapDetail(r.getSlug(), userId);
            result.add(new RoadmapSummaryDto(
                    r.getId(),
                    r.getTitle(),
                    r.getSlug(),
                    r.getDescription(),
                    r.getEstimatedDuration(),
                    r.getTotalSprints(),
                    r.getIconName(),
                    detail.getProgressPercent(),
                    detail.getCompletedItems(),
                    detail.getTotalItems(),
                    detail.getStatus()
            ));
        }

        return result;
    }

    /**
     * Returns full roadmap tree with evaluated server-authoritative node states.
     */
    @Transactional(readOnly = true)
    public RoadmapDetailDto getRoadmapDetail(String slugOrId, UUID userId) {
        Roadmap roadmap = resolveRoadmap(slugOrId);

        // 1. Fetch sprints
        List<RoadmapSprint> sprints = sprintRepository.findByRoadmapIdAndIsPublishedTrueOrderByPositionAsc(roadmap.getId());
        if (sprints.isEmpty()) {
            return new RoadmapDetailDto(
                    roadmap.getId(), roadmap.getTitle(), roadmap.getSlug(), roadmap.getDescription(),
                    roadmap.getEstimatedDuration(), roadmap.getTotalSprints(), roadmap.getIconName(),
                    0.0, 0, 0, "AVAILABLE", Collections.emptyList()
            );
        }

        List<UUID> sprintIds = sprints.stream().map(RoadmapSprint::getId).collect(Collectors.toList());

        // 2. Fetch days
        List<RoadmapDay> days = dayRepository.findBySprintIdInOrderByPositionAsc(sprintIds);
        List<UUID> dayIds = days.stream().map(RoadmapDay::getId).collect(Collectors.toList());

        // 3. Fetch day topics
        List<RoadmapDayTopic> topics = dayIds.isEmpty() ? Collections.emptyList()
                : topicRepository.findByDayIdInOrderByPositionAsc(dayIds);

        // 4. Fetch items
        List<RoadmapItem> items = dayIds.isEmpty() ? Collections.emptyList()
                : itemRepository.findByDayIdInOrderByPositionAsc(dayIds);
        List<UUID> itemIds = items.stream().map(RoadmapItem::getId).collect(Collectors.toList());

        // 5. Fetch problem references
        List<RoadmapProblemReference> refs = itemIds.isEmpty() ? Collections.emptyList()
                : problemRefRepository.findByRoadmapItemIdInOrderByPositionAsc(itemIds);

        Map<UUID, RoadmapProblemReference> refByItem = refs.stream()
                .collect(Collectors.toMap(RoadmapProblemReference::getRoadmapItemId, r -> r, (a, b) -> a));

        // 6. Fetch canonical Problem Catalog summaries
        Set<String> verniqIds = refs.stream()
                .map(RoadmapProblemReference::getVerniqProblemId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<String, Problem> problemCatalog = verniqIds.isEmpty() ? Collections.emptyMap()
                : problemRepository.findByVerniqIdIn(verniqIds).stream()
                .collect(Collectors.toMap(Problem::getVerniqId, p -> p, (a, b) -> a));

        // 7. Authoritative user progress:
        // Problem status map from Phase F (verniqId -> "SOLVED" | "ATTEMPTED")
        Map<String, String> userProblemStatusMap = (userId != null)
                ? userProgressService.getUserProblemStatusMap(userId)
                : Collections.emptyMap();

        // Non-problem item progress (e.g. CONCEPT/LECTURE reading completed)
        Map<UUID, String> userItemStatusMap = new HashMap<>();
        if (userId != null && !itemIds.isEmpty()) {
            List<UserRoadmapItemProgress> itemProgresses = userItemProgressRepository.findByUserIdAndRoadmapItemIdIn(userId, itemIds);
            for (UserRoadmapItemProgress uip : itemProgresses) {
                userItemStatusMap.put(uip.getRoadmapItemId(), uip.getStatus());
            }
        }

        // Group topics and items by day
        Map<UUID, List<RoadmapTopicDto>> topicsByDay = new HashMap<>();
        for (RoadmapDayTopic t : topics) {
            topicsByDay.computeIfAbsent(t.getDayId(), k -> new ArrayList<>())
                    .add(new RoadmapTopicDto(t.getId(), t.getDayId(), t.getTitle(), t.getDescription(), t.getPosition()));
        }

        Map<UUID, List<RoadmapItem>> itemsByDay = items.stream()
                .collect(Collectors.groupingBy(RoadmapItem::getDayId));

        Map<UUID, List<RoadmapDay>> daysBySprint = days.stream()
                .collect(Collectors.groupingBy(RoadmapDay::getSprintId));

        // 8. Evaluate sequential prerequisite locking and node states
        boolean previousSprintCompleted = true;
        int totalRequiredItems = 0;
        int completedRequiredItems = 0;

        List<RoadmapSprintDto> sprintDtos = new ArrayList<>();

        for (RoadmapSprint sprint : sprints) {
            boolean sprintLocked = !previousSprintCompleted;
            boolean previousDayCompleted = true;

            List<RoadmapDay> sprintDays = daysBySprint.getOrDefault(sprint.getId(), Collections.emptyList());
            List<RoadmapDayDto> dayDtos = new ArrayList<>();

            for (RoadmapDay day : sprintDays) {
                boolean dayLocked = sprintLocked || !previousDayCompleted;
                boolean previousItemSatisfied = true;

                List<RoadmapItem> dayItems = itemsByDay.getOrDefault(day.getId(), Collections.emptyList());
                List<RoadmapItemDto> itemDtos = new ArrayList<>();

                int dayTotalRequired = 0;
                int dayCompletedRequired = 0;
                boolean dayHasActivity = false;

                for (RoadmapItem item : dayItems) {
                    RoadmapProblemReference ref = refByItem.get(item.getId());
                    RoadmapProblemReferenceDto refDto = null;
                    String itemStatus = "AVAILABLE";

                    if (ref != null) {
                        Problem p = problemCatalog.get(ref.getVerniqProblemId());
                        String problemUserStatus = userProblemStatusMap.getOrDefault(ref.getVerniqProblemId(), "UNATTEMPTED");
                        List<String> topicNames = (p != null && p.getTopics() != null)
                                ? p.getTopics().stream().map(com.verniq.api.problems.domain.Topic::getName).collect(Collectors.toList())
                                : Collections.emptyList();

                        RoadmapProblemSummaryDto pSummary = new RoadmapProblemSummaryDto(
                                ref.getVerniqProblemId(),
                                p != null ? p.getTitle() : "Problem " + ref.getVerniqProblemId(),
                                p != null ? p.getSlug() : "",
                                p != null ? p.getDifficulty().name().toLowerCase() : "medium",
                                topicNames,
                                problemUserStatus
                        );

                        refDto = new RoadmapProblemReferenceDto(
                                ref.getId(), ref.getVerniqProblemId(), pSummary,
                                ref.getPosition(), ref.getRequired(), ref.getNotes()
                        );

                        // Authoritative problem state:
                        // SOLVED -> COMPLETED
                        // ATTEMPTED -> IN_PROGRESS
                        // UNATTEMPTED -> AVAILABLE or LOCKED
                        if ("SOLVED".equalsIgnoreCase(problemUserStatus)) {
                            itemStatus = "COMPLETED";
                        } else if ("ATTEMPTED".equalsIgnoreCase(problemUserStatus)) {
                            itemStatus = "IN_PROGRESS";
                            dayHasActivity = true;
                        } else {
                            itemStatus = (dayLocked || !previousItemSatisfied) ? "LOCKED" : "AVAILABLE";
                        }
                    } else {
                        // Non-problem item (Concept, Reading, Lecture, Revision)
                        String manualStatus = userItemStatusMap.get(item.getId());
                        if ("COMPLETED".equalsIgnoreCase(manualStatus)) {
                            itemStatus = "COMPLETED";
                        } else if ("SKIPPED".equalsIgnoreCase(manualStatus)) {
                            itemStatus = "SKIPPED";
                        } else {
                            itemStatus = (dayLocked || !previousItemSatisfied) ? "LOCKED" : "AVAILABLE";
                        }
                    }

                    if (Boolean.TRUE.equals(item.getRequired())) {
                        dayTotalRequired++;
                        totalRequiredItems++;
                        if ("COMPLETED".equals(itemStatus) || "SKIPPED".equals(itemStatus)) {
                            dayCompletedRequired++;
                            completedRequiredItems++;
                        } else {
                            previousItemSatisfied = false;
                        }
                    }

                    if ("COMPLETED".equals(itemStatus) || "IN_PROGRESS".equals(itemStatus)) {
                        dayHasActivity = true;
                    }

                    itemDtos.add(new RoadmapItemDto(
                            item.getId(), item.getDayId(), item.getTopicId(),
                            item.getTitle(), item.getDescription(), item.getItemType().name(),
                            item.getPosition(), item.getRequired(), item.getEstimatedMinutes(),
                            item.getContentUrl(), item.getContentMarkdown(), itemStatus, refDto
                    ));
                }

                // Day status derivation
                boolean dayCompleted = (dayTotalRequired > 0 && dayCompletedRequired == dayTotalRequired);
                String dayStatus = "AVAILABLE";
                if (dayLocked) {
                    dayStatus = "LOCKED";
                } else if (dayCompleted) {
                    dayStatus = "COMPLETED";
                } else if (dayHasActivity) {
                    dayStatus = "IN_PROGRESS";
                }

                previousDayCompleted = dayCompleted;

                List<String> objectives = parseJsonList(day.getLearningObjectives());

                dayDtos.add(new RoadmapDayDto(
                        day.getId(), day.getSprintId(), day.getDayNumber(),
                        day.getTitle(), day.getDescription(), objectives,
                        day.getPosition(), dayStatus,
                        topicsByDay.getOrDefault(day.getId(), Collections.emptyList()),
                        itemDtos
                ));
            }

            // Sprint status derivation
            boolean sprintCompleted = (!dayDtos.isEmpty() && dayDtos.stream().allMatch(d -> "COMPLETED".equals(d.getStatus())));
            boolean sprintHasActivity = dayDtos.stream().anyMatch(d -> "IN_PROGRESS".equals(d.getStatus()) || "COMPLETED".equals(d.getStatus()));

            String sprintStatus = "AVAILABLE";
            if (sprintLocked) {
                sprintStatus = "LOCKED";
            } else if (sprintCompleted) {
                sprintStatus = "COMPLETED";
            } else if (sprintHasActivity) {
                sprintStatus = "IN_PROGRESS";
            }

            previousSprintCompleted = sprintCompleted;

            sprintDtos.add(new RoadmapSprintDto(
                    sprint.getId(), sprint.getRoadmapId(), sprint.getTitle(), sprint.getSlug(),
                    sprint.getDescription(), sprint.getPosition(), sprint.getEstimatedHours(),
                    sprintStatus, dayDtos
            ));
        }

        double progressPercent = totalRequiredItems > 0
                ? Math.round(((double) completedRequiredItems / totalRequiredItems) * 1000.0) / 10.0
                : 0.0;

        String roadmapStatus = "AVAILABLE";
        if (progressPercent >= 100.0 && totalRequiredItems > 0) {
            roadmapStatus = "COMPLETED";
        } else if (completedRequiredItems > 0 || sprintDtos.stream().anyMatch(s -> "IN_PROGRESS".equals(s.getStatus()))) {
            roadmapStatus = "IN_PROGRESS";
        }

        return new RoadmapDetailDto(
                roadmap.getId(), roadmap.getTitle(), roadmap.getSlug(), roadmap.getDescription(),
                roadmap.getEstimatedDuration(), roadmap.getTotalSprints(), roadmap.getIconName(),
                progressPercent, completedRequiredItems, totalRequiredItems, roadmapStatus, sprintDtos
        );
    }

    /**
     * Exposes roadmap-level node and progress counts (Section 6).
     */
    @Transactional(readOnly = true)
    public RoadmapProgressSummaryDto getRoadmapProgress(String slugOrId, UUID userId) {
        RoadmapDetailDto detail = getRoadmapDetail(slugOrId, userId);

        int totalNodes = 0;
        int completedNodes = 0;
        int availableNodes = 0;
        int inProgressNodes = 0;
        int lockedNodes = 0;

        String currentSprintTitle = null;
        Integer currentDayNumber = null;

        for (RoadmapSprintDto sprint : detail.getSprints()) {
            totalNodes++;
            switch (sprint.getStatus()) {
                case "COMPLETED" -> completedNodes++;
                case "AVAILABLE" -> availableNodes++;
                case "IN_PROGRESS" -> {
                    inProgressNodes++;
                    if (currentSprintTitle == null) currentSprintTitle = sprint.getTitle();
                }
                case "LOCKED" -> lockedNodes++;
            }

            for (RoadmapDayDto day : sprint.getDays()) {
                totalNodes++;
                switch (day.getStatus()) {
                    case "COMPLETED" -> completedNodes++;
                    case "AVAILABLE" -> availableNodes++;
                    case "IN_PROGRESS" -> {
                        inProgressNodes++;
                        if (currentDayNumber == null) currentDayNumber = day.getDayNumber();
                    }
                    case "LOCKED" -> lockedNodes++;
                }

                for (RoadmapItemDto item : day.getItems()) {
                    totalNodes++;
                    switch (item.getStatus()) {
                        case "COMPLETED", "SKIPPED" -> completedNodes++;
                        case "AVAILABLE" -> availableNodes++;
                        case "IN_PROGRESS" -> inProgressNodes++;
                        case "LOCKED" -> lockedNodes++;
                    }
                }
            }
        }

        if (currentSprintTitle == null && !detail.getSprints().isEmpty()) {
            currentSprintTitle = detail.getSprints().get(0).getTitle();
        }
        if (currentDayNumber == null && !detail.getSprints().isEmpty() && !detail.getSprints().get(0).getDays().isEmpty()) {
            currentDayNumber = detail.getSprints().get(0).getDays().get(0).getDayNumber();
        }

        return new RoadmapProgressSummaryDto(
                detail.getId(), detail.getTitle(), detail.getSlug(),
                totalNodes, completedNodes, availableNodes, inProgressNodes, lockedNodes,
                detail.getTotalItems(), detail.getCompletedItems(), detail.getProgressPercent(),
                currentSprintTitle, currentDayNumber
        );
    }

    /**
     * Deterministic next recommended problem algorithm (Sections 9, 10, 11, 12, 16).
     * Strictly explainable, stable, and server-authoritative.
     */
    @Transactional(readOnly = true)
    public NextRecommendedProblemDto getNextRecommendedProblem(String slugOrId, UUID userId) {
        RoadmapDetailDto detail = getRoadmapDetail(slugOrId, userId);

        // Priority 1: Unsolved problem in current active/unlocked sprints & days
        for (RoadmapSprintDto sprint : detail.getSprints()) {
            if ("LOCKED".equals(sprint.getStatus())) {
                continue;
            }

            for (RoadmapDayDto day : sprint.getDays()) {
                if ("LOCKED".equals(day.getStatus())) {
                    continue;
                }

                for (RoadmapItemDto item : day.getItems()) {
                    RoadmapProblemReferenceDto probRef = item.getProblemReference();
                    if (probRef == null) {
                        continue;
                    }

                    RoadmapProblemSummaryDto pSummary = probRef.getProblemSummary();
                    String userStatus = pSummary != null ? pSummary.getUserStatus() : "UNATTEMPTED";

                    // Never recommend an already solved problem
                    if ("SOLVED".equalsIgnoreCase(userStatus)) {
                        continue;
                    }

                    String reason = "Next unsolved problem in your current roadmap section: "
                            + sprint.getTitle() + " (Day " + day.getDayNumber() + ")";

                    return new NextRecommendedProblemDto(
                            probRef.getVerniqProblemId(),
                            pSummary != null ? pSummary.getSlug() : "",
                            pSummary != null ? pSummary.getTitle() : "Problem " + probRef.getVerniqProblemId(),
                            pSummary != null ? pSummary.getDifficulty() : "medium",
                            pSummary != null ? pSummary.getTopics() : Collections.emptyList(),
                            sprint.getTitle(),
                            day.getDayNumber(),
                            day.getTitle(),
                            item.getId(),
                            item.getTitle(),
                            reason
                    );
                }
            }
        }

        // Priority 2: If all problems in currently unlocked days are solved, look ahead to the next section in roadmap
        for (RoadmapSprintDto sprint : detail.getSprints()) {
            for (RoadmapDayDto day : sprint.getDays()) {
                for (RoadmapItemDto item : day.getItems()) {
                    RoadmapProblemReferenceDto probRef = item.getProblemReference();
                    if (probRef == null) {
                        continue;
                    }

                    RoadmapProblemSummaryDto pSummary = probRef.getProblemSummary();
                    String userStatus = pSummary != null ? pSummary.getUserStatus() : "UNATTEMPTED";

                    if ("SOLVED".equalsIgnoreCase(userStatus)) {
                        continue;
                    }

                    String reason = "Next unsolved problem in your roadmap progression: "
                            + sprint.getTitle() + " (Day " + day.getDayNumber() + ")";

                    return new NextRecommendedProblemDto(
                            probRef.getVerniqProblemId(),
                            pSummary != null ? pSummary.getSlug() : "",
                            pSummary != null ? pSummary.getTitle() : "Problem " + probRef.getVerniqProblemId(),
                            pSummary != null ? pSummary.getDifficulty() : "medium",
                            pSummary != null ? pSummary.getTopics() : Collections.emptyList(),
                            sprint.getTitle(),
                            day.getDayNumber(),
                            day.getTitle(),
                            item.getId(),
                            item.getTitle(),
                            reason
                    );
                }
            }
        }

        return null;
    }

    /**
     * Completes a non-problem item (Concept, Reading, Lecture, Revision).
     * Attempting to complete a problem item through this API is strictly rejected (Section 3 & 5).
     */
    @Transactional
    public CompleteItemResponse completeNonProblemItem(UUID itemId, UUID userId) {
        if (itemId == null || userId == null) {
            throw new InvalidRequestException("Item ID and User ID are required");
        }

        RoadmapItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Roadmap item not found: " + itemId));

        Optional<RoadmapProblemReference> ref = problemRefRepository.findByRoadmapItemId(itemId);
        if (ref.isPresent() || item.getItemType() == LearningItemType.PROBLEM) {
            throw new InvalidRequestException("Problem items can only be completed by submitting an accepted solution to the judge.");
        }

        UserRoadmapItemProgress progress = userItemProgressRepository.findByUserIdAndRoadmapItemId(userId, itemId)
                .orElse(new UserRoadmapItemProgress(userId, itemId, "COMPLETED"));

        progress.setStatus("COMPLETED");
        progress.setCompletedAt(Instant.now());
        progress.setUpdatedAt(Instant.now());
        userItemProgressRepository.save(progress);

        return new CompleteItemResponse(itemId, "COMPLETED", progress.getCompletedAt(), "Item marked as completed");
    }

    private Roadmap resolveRoadmap(String slugOrId) {
        final String lookup = (slugOrId == null || slugOrId.isBlank()) ? "dsa-mastery" : slugOrId;

        try {
            UUID id = UUID.fromString(lookup);
            Optional<Roadmap> byId = roadmapRepository.findByIdAndIsPublishedTrue(id);
            if (byId.isPresent()) return byId.get();
        } catch (IllegalArgumentException ignored) {}

        return roadmapRepository.findBySlugAndIsPublishedTrue(lookup)
                .orElseThrow(() -> new ResourceNotFoundException("Roadmap not found: " + lookup));
    }

    private List<String> parseJsonList(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
