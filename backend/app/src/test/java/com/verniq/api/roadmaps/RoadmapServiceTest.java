package com.verniq.api.roadmaps;

import com.verniq.api.common.exception.InvalidRequestException;
import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.domain.ProblemDifficulty;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.progress.service.UserProgressService;
import com.verniq.api.roadmaps.domain.*;
import com.verniq.api.roadmaps.dto.*;
import com.verniq.api.roadmaps.repository.*;
import com.verniq.api.roadmaps.service.RoadmapService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoadmapServiceTest {

    @Mock
    private RoadmapRepository roadmapRepository;

    @Mock
    private RoadmapSprintRepository sprintRepository;

    @Mock
    private RoadmapDayRepository dayRepository;

    @Mock
    private RoadmapDayTopicRepository topicRepository;

    @Mock
    private RoadmapItemRepository itemRepository;

    @Mock
    private RoadmapProblemReferenceRepository problemRefRepository;

    @Mock
    private UserRoadmapItemProgressRepository userItemProgressRepository;

    @Mock
    private UserRoadmapProgressRepository userRoadmapProgressRepository;

    @Mock
    private ProblemRepository problemRepository;

    @Mock
    private UserProgressService userProgressService;

    private RoadmapService roadmapService;

    private UUID userA;
    private UUID userB;

    private Roadmap roadmap;
    private RoadmapSprint sprint1;
    private RoadmapSprint sprint2;
    private RoadmapDay day1;
    private RoadmapDay day2;
    private RoadmapDay day3;

    private RoadmapItem item1Concept;
    private RoadmapItem item2Problem;
    private RoadmapItem item3Problem;
    private RoadmapItem item4Problem;

    private RoadmapProblemReference refItem2;
    private RoadmapProblemReference refItem3;
    private RoadmapProblemReference refItem4;

    private Problem prob1;
    private Problem prob2;
    private Problem prob3;

    @BeforeEach
    void setUp() {
        roadmapService = new RoadmapService(
                roadmapRepository, sprintRepository, dayRepository, topicRepository,
                itemRepository, problemRefRepository, userItemProgressRepository,
                userRoadmapProgressRepository, problemRepository, userProgressService
        );

        userA = UUID.randomUUID();
        userB = UUID.randomUUID();

        // Build Roadmap Structure:
        // Roadmap: dsa-mastery
        //   Sprint 1 (pos 1):
        //     Day 1 (pos 1):
        //       Item 1: CONCEPT (pos 1, required)
        //       Item 2: PROBLEM (pos 2, required) -> VRQ-000001 (Two Sum)
        //     Day 2 (pos 2):
        //       Item 3: PROBLEM (pos 1, required) -> VRQ-000006 (Stock)
        //   Sprint 2 (pos 2):
        //     Day 3 (pos 1):
        //       Item 4: PROBLEM (pos 1, required) -> VRQ-000008 (3Sum)

        roadmap = new Roadmap();
        roadmap.setId(UUID.randomUUID());
        roadmap.setTitle("DSA Interview Mastery");
        roadmap.setSlug("dsa-mastery");
        roadmap.setIsPublished(true);

        sprint1 = new RoadmapSprint();
        sprint1.setId(UUID.randomUUID());
        sprint1.setRoadmapId(roadmap.getId());
        sprint1.setTitle("Sprint 1");
        sprint1.setSlug("sprint-1");
        sprint1.setPosition(1);
        sprint1.setIsPublished(true);

        sprint2 = new RoadmapSprint();
        sprint2.setId(UUID.randomUUID());
        sprint2.setRoadmapId(roadmap.getId());
        sprint2.setTitle("Sprint 2");
        sprint2.setSlug("sprint-2");
        sprint2.setPosition(2);
        sprint2.setIsPublished(true);

        day1 = new RoadmapDay();
        day1.setId(UUID.randomUUID());
        day1.setSprintId(sprint1.getId());
        day1.setDayNumber(1);
        day1.setTitle("Day 1");
        day1.setPosition(1);

        day2 = new RoadmapDay();
        day2.setId(UUID.randomUUID());
        day2.setSprintId(sprint1.getId());
        day2.setDayNumber(2);
        day2.setTitle("Day 2");
        day2.setPosition(2);

        day3 = new RoadmapDay();
        day3.setId(UUID.randomUUID());
        day3.setSprintId(sprint2.getId());
        day3.setDayNumber(3);
        day3.setTitle("Day 3");
        day3.setPosition(1);

        item1Concept = new RoadmapItem();
        item1Concept.setId(UUID.randomUUID());
        item1Concept.setDayId(day1.getId());
        item1Concept.setTitle("Concept: Invariants");
        item1Concept.setItemType(LearningItemType.CONCEPT);
        item1Concept.setPosition(1);
        item1Concept.setRequired(true);

        item2Problem = new RoadmapItem();
        item2Problem.setId(UUID.randomUUID());
        item2Problem.setDayId(day1.getId());
        item2Problem.setTitle("Solve Two Sum");
        item2Problem.setItemType(LearningItemType.PROBLEM);
        item2Problem.setPosition(2);
        item2Problem.setRequired(true);

        item3Problem = new RoadmapItem();
        item3Problem.setId(UUID.randomUUID());
        item3Problem.setDayId(day2.getId());
        item3Problem.setTitle("Solve Stock");
        item3Problem.setItemType(LearningItemType.PROBLEM);
        item3Problem.setPosition(1);
        item3Problem.setRequired(true);

        item4Problem = new RoadmapItem();
        item4Problem.setId(UUID.randomUUID());
        item4Problem.setDayId(day3.getId());
        item4Problem.setTitle("Solve 3Sum");
        item4Problem.setItemType(LearningItemType.PROBLEM);
        item4Problem.setPosition(1);
        item4Problem.setRequired(true);

        refItem2 = new RoadmapProblemReference();
        refItem2.setId(UUID.randomUUID());
        refItem2.setRoadmapItemId(item2Problem.getId());
        refItem2.setVerniqProblemId("VRQ-000001");
        refItem2.setPosition(1);
        refItem2.setRequired(true);

        refItem3 = new RoadmapProblemReference();
        refItem3.setId(UUID.randomUUID());
        refItem3.setRoadmapItemId(item3Problem.getId());
        refItem3.setVerniqProblemId("VRQ-000006");
        refItem3.setPosition(1);
        refItem3.setRequired(true);

        refItem4 = new RoadmapProblemReference();
        refItem4.setId(UUID.randomUUID());
        refItem4.setRoadmapItemId(item4Problem.getId());
        refItem4.setVerniqProblemId("VRQ-000008");
        refItem4.setPosition(1);
        refItem4.setRequired(true);

        prob1 = new Problem();
        prob1.setVerniqId("VRQ-000001");
        prob1.setTitle("Two Sum");
        prob1.setSlug("two-sum");
        prob1.setDifficulty(ProblemDifficulty.EASY);

        prob2 = new Problem();
        prob2.setVerniqId("VRQ-000006");
        prob2.setTitle("Best Time to Buy and Sell Stock");
        prob2.setSlug("best-time-to-buy-and-sell-stock");
        prob2.setDifficulty(ProblemDifficulty.EASY);

        prob3 = new Problem();
        prob3.setVerniqId("VRQ-000008");
        prob3.setTitle("3Sum");
        prob3.setSlug("3sum");
        prob3.setDifficulty(ProblemDifficulty.MEDIUM);

        lenient().when(roadmapRepository.findBySlugAndIsPublishedTrue("dsa-mastery")).thenReturn(Optional.of(roadmap));
        lenient().when(sprintRepository.findByRoadmapIdAndIsPublishedTrueOrderByPositionAsc(roadmap.getId()))
                .thenReturn(List.of(sprint1, sprint2));
        lenient().when(dayRepository.findBySprintIdInOrderByPositionAsc(List.of(sprint1.getId(), sprint2.getId())))
                .thenReturn(List.of(day1, day2, day3));
        lenient().when(topicRepository.findByDayIdInOrderByPositionAsc(any()))
                .thenReturn(Collections.emptyList());
        lenient().when(itemRepository.findByDayIdInOrderByPositionAsc(any()))
                .thenReturn(List.of(item1Concept, item2Problem, item3Problem, item4Problem));
        lenient().when(problemRefRepository.findByRoadmapItemIdInOrderByPositionAsc(any()))
                .thenReturn(List.of(refItem2, refItem3, refItem4));
        lenient().when(problemRepository.findByVerniqIdIn(any()))
                .thenReturn(List.of(prob1, prob2, prob3));
    }

    @Test
    @DisplayName("Test A — Fresh User: No solved problems -> First available node & recommendation")
    void testFreshUserFirstNodeAvailable() {
        when(userProgressService.getUserProblemStatusMap(userA)).thenReturn(Collections.emptyMap());
        when(userItemProgressRepository.findByUserIdAndRoadmapItemIdIn(eq(userA), any()))
                .thenReturn(Collections.emptyList());

        RoadmapDetailDto detail = roadmapService.getRoadmapDetail("dsa-mastery", userA);

        assertThat(detail.getSprints()).hasSize(2);
        // Sprint 1 should be AVAILABLE
        assertThat(detail.getSprints().get(0).getStatus()).isEqualTo("AVAILABLE");
        // Sprint 2 should be LOCKED (prerequisite Sprint 1 not complete)
        assertThat(detail.getSprints().get(1).getStatus()).isEqualTo("LOCKED");

        // Day 1 is AVAILABLE
        assertThat(detail.getSprints().get(0).getDays().get(0).getStatus()).isEqualTo("AVAILABLE");
        // Day 2 is LOCKED
        assertThat(detail.getSprints().get(0).getDays().get(1).getStatus()).isEqualTo("LOCKED");

        // Next recommended problem should be VRQ-000001 (Two Sum)
        NextRecommendedProblemDto next = roadmapService.getNextRecommendedProblem("dsa-mastery", userA);
        assertThat(next).isNotNull();
        assertThat(next.getProblemId()).isEqualTo("VRQ-000001");
        assertThat(next.getTitle()).isEqualTo("Two Sum");
        assertThat(next.getReason()).contains("Sprint 1").contains("Day 1");
    }

    @Test
    @DisplayName("Test B — Partial Progress: Failing/Attempting does NOT complete node, remains IN_PROGRESS")
    void testPartialProgressRemainsInProgress() {
        // User solved concept, attempted Two Sum with WRONG_ANSWER
        when(userProgressService.getUserProblemStatusMap(userA)).thenReturn(Map.of("VRQ-000001", "ATTEMPTED"));
        UserRoadmapItemProgress uip = new UserRoadmapItemProgress(userA, item1Concept.getId(), "COMPLETED");
        when(userItemProgressRepository.findByUserIdAndRoadmapItemIdIn(eq(userA), any()))
                .thenReturn(List.of(uip));

        RoadmapDetailDto detail = roadmapService.getRoadmapDetail("dsa-mastery", userA);

        // Sprint 1 and Day 1 must be IN_PROGRESS (not COMPLETED)
        assertThat(detail.getSprints().get(0).getStatus()).isEqualTo("IN_PROGRESS");
        assertThat(detail.getSprints().get(0).getDays().get(0).getStatus()).isEqualTo("IN_PROGRESS");
        // Day 2 is still LOCKED
        assertThat(detail.getSprints().get(0).getDays().get(1).getStatus()).isEqualTo("LOCKED");

        // Next problem remains VRQ-000001
        NextRecommendedProblemDto next = roadmapService.getNextRecommendedProblem("dsa-mastery", userA);
        assertThat(next).isNotNull();
        assertThat(next.getProblemId()).isEqualTo("VRQ-000001");
    }

    @Test
    @DisplayName("Test C — Node Completion: All required items solved -> Day 1 COMPLETED, Day 2 AVAILABLE")
    void testNodeCompletionUnlocksNextNode() {
        // User completed Concept 1 and solved VRQ-000001
        when(userProgressService.getUserProblemStatusMap(userA)).thenReturn(Map.of("VRQ-000001", "SOLVED"));
        UserRoadmapItemProgress uip = new UserRoadmapItemProgress(userA, item1Concept.getId(), "COMPLETED");
        when(userItemProgressRepository.findByUserIdAndRoadmapItemIdIn(eq(userA), any()))
                .thenReturn(List.of(uip));

        RoadmapDetailDto detail = roadmapService.getRoadmapDetail("dsa-mastery", userA);

        // Day 1 is COMPLETED!
        assertThat(detail.getSprints().get(0).getDays().get(0).getStatus()).isEqualTo("COMPLETED");
        // Day 2 is now unlocked and AVAILABLE!
        assertThat(detail.getSprints().get(0).getDays().get(1).getStatus()).isEqualTo("AVAILABLE");
        // Sprint 1 is IN_PROGRESS (Day 1 done, Day 2 available)
        assertThat(detail.getSprints().get(0).getStatus()).isEqualTo("IN_PROGRESS");
        // Sprint 2 remains LOCKED
        assertThat(detail.getSprints().get(1).getStatus()).isEqualTo("LOCKED");

        // Next recommended problem is now VRQ-000006 on Day 2!
        NextRecommendedProblemDto next = roadmapService.getNextRecommendedProblem("dsa-mastery", userA);
        assertThat(next).isNotNull();
        assertThat(next.getProblemId()).isEqualTo("VRQ-000006");
        assertThat(next.getTitle()).isEqualTo("Best Time to Buy and Sell Stock");
        assertThat(next.getReason()).contains("Day 2");
    }

    @Test
    @DisplayName("Test D & E — Solved Problems are Never Recommended")
    void testSolvedProblemNeverRecommended() {
        // User solved VRQ-000001 and VRQ-000006, completed Day 1 & Day 2 -> Sprint 1 complete -> Sprint 2 unlocked
        when(userProgressService.getUserProblemStatusMap(userA)).thenReturn(Map.of(
                "VRQ-000001", "SOLVED",
                "VRQ-000006", "SOLVED"
        ));
        UserRoadmapItemProgress uip = new UserRoadmapItemProgress(userA, item1Concept.getId(), "COMPLETED");
        when(userItemProgressRepository.findByUserIdAndRoadmapItemIdIn(eq(userA), any()))
                .thenReturn(List.of(uip));

        RoadmapDetailDto detail = roadmapService.getRoadmapDetail("dsa-mastery", userA);

        // Sprint 1 should be COMPLETED!
        assertThat(detail.getSprints().get(0).getStatus()).isEqualTo("COMPLETED");
        // Sprint 2 should be unlocked and AVAILABLE!
        assertThat(detail.getSprints().get(1).getStatus()).isEqualTo("AVAILABLE");

        // Next recommended problem must be VRQ-000008 (3Sum in Sprint 2)
        NextRecommendedProblemDto next = roadmapService.getNextRecommendedProblem("dsa-mastery", userA);
        assertThat(next).isNotNull();
        assertThat(next.getProblemId()).isEqualTo("VRQ-000008");
        assertThat(next.getTitle()).isEqualTo("3Sum");
    }

    @Test
    @DisplayName("Test F — Strict User Isolation: User B cannot access User A's roadmap progress")
    void testUserIsolation() {
        // User A solved all problems
        when(userProgressService.getUserProblemStatusMap(userA)).thenReturn(Map.of("VRQ-000001", "SOLVED"));
        when(userItemProgressRepository.findByUserIdAndRoadmapItemIdIn(eq(userA), any()))
                .thenReturn(List.of(new UserRoadmapItemProgress(userA, item1Concept.getId(), "COMPLETED")));

        // User B has zero progress
        when(userProgressService.getUserProblemStatusMap(userB)).thenReturn(Collections.emptyMap());
        when(userItemProgressRepository.findByUserIdAndRoadmapItemIdIn(eq(userB), any()))
                .thenReturn(Collections.emptyList());

        RoadmapDetailDto detailA = roadmapService.getRoadmapDetail("dsa-mastery", userA);
        RoadmapDetailDto detailB = roadmapService.getRoadmapDetail("dsa-mastery", userB);

        // User A has 2 completed items (concept + two sum)
        assertThat(detailA.getCompletedItems()).isEqualTo(2);
        // User B has 0 completed items
        assertThat(detailB.getCompletedItems()).isEqualTo(0);
        assertThat(detailB.getProgressPercent()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Test G — Security Protection: Problem items cannot be manually marked completed via API")
    void testProblemItemManualCompleteRejected() {
        when(itemRepository.findById(item2Problem.getId())).thenReturn(Optional.of(item2Problem));
        when(problemRefRepository.findByRoadmapItemId(item2Problem.getId())).thenReturn(Optional.of(refItem2));

        assertThatThrownBy(() -> roadmapService.completeNonProblemItem(item2Problem.getId(), userA))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Problem items can only be completed by submitting an accepted solution to the judge");

        verify(userItemProgressRepository, never()).save(any());
    }
}
