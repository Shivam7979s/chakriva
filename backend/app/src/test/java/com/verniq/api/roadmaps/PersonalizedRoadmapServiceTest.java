package com.verniq.api.roadmaps;

import com.verniq.api.common.exception.ConflictException;
import com.verniq.api.common.exception.InvalidRequestException;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.progress.service.UserProgressService;
import com.verniq.api.roadmaps.domain.UserStudyPlan;
import com.verniq.api.roadmaps.dto.PersonalizedRoadmapDto;
import com.verniq.api.roadmaps.dto.SavePersonalizedRoadmapRequest;
import com.verniq.api.roadmaps.repository.UserStudyPlanRepository;
import com.verniq.api.roadmaps.service.PersonalizedRoadmapService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PersonalizedRoadmapServiceTest {

    @Mock
    private UserStudyPlanRepository studyPlanRepository;

    @Mock
    private UserProgressService userProgressService;

    @Mock
    private ProblemRepository problemRepository;

    private PersonalizedRoadmapService service;

    private static final UUID USER_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    @BeforeEach
    void setUp() {
        service = new PersonalizedRoadmapService(studyPlanRepository, userProgressService, problemRepository);
    }

    @Test
    @DisplayName("Judge Integrity: Problem task is marked completed ONLY if judge confirms SOLVED")
    void testJudgeIntegrityReconciliation() {
        // Prepare mock plan where task has status 'completed' from client, but judge map does NOT confirm solved
        Map<String, Object> task1 = new HashMap<>();
        task1.put("id", "task-1");
        task1.put("verniqProblemId", "VRQ-000001");
        task1.put("status", "completed"); // unverified client attempt
        task1.put("completedAt", "2026-10-20T10:00:00Z");

        Map<String, Object> day1 = new HashMap<>();
        day1.put("date", LocalDate.now().toString());
        day1.put("tasks", new ArrayList<>(List.of(task1)));

        Map<String, Object> week1 = new HashMap<>();
        week1.put("days", new ArrayList<>(List.of(day1)));

        Map<String, Object> planData = new HashMap<>();
        planData.put("weeks", new ArrayList<>(List.of(week1)));

        UserStudyPlan plan = new UserStudyPlan();
        plan.setUserId(USER_ID);
        plan.setPlanData("{\"weeks\":[{\"days\":[{\"date\":\"" + LocalDate.now() + "\",\"tasks\":[{\"id\":\"task-1\",\"verniqProblemId\":\"VRQ-000001\",\"status\":\"completed\"}]}]}]}");

        when(studyPlanRepository.findByUserIdAndIsActiveTrue(USER_ID)).thenReturn(Optional.of(plan));
        // Judge progress map returns empty (unsolved)
        when(userProgressService.getUserProblemStatusMap(USER_ID)).thenReturn(Collections.emptyMap());

        Optional<PersonalizedRoadmapDto> result = service.getActiveRoadmap(USER_ID);

        assertThat(result).isPresent();
        Map<String, Object> returnedPlan = result.get().planData();
        assertThat(returnedPlan.get("completedTasks")).isEqualTo(0);
        assertThat(returnedPlan.get("progressPercent")).isEqualTo(0);

        // When judge confirms SOLVED, task status is updated to completed
        when(userProgressService.getUserProblemStatusMap(USER_ID)).thenReturn(Map.of("VRQ-000001", "SOLVED"));
        Optional<PersonalizedRoadmapDto> resultSolved = service.getActiveRoadmap(USER_ID);

        assertThat(resultSolved).isPresent();
        assertThat(resultSolved.get().planData().get("completedTasks")).isEqualTo(1);
        assertThat(resultSolved.get().planData().get("progressPercent")).isEqualTo(100);
    }

    @Test
    @DisplayName("Concurrency: Outdated client version throws ConflictException")
    void testOptimisticConcurrencyConflict() {
        UserStudyPlan existingPlan = new UserStudyPlan();
        existingPlan.setUserId(USER_ID);
        existingPlan.setVersion(3);
        existingPlan.setPlanData("{}");

        when(studyPlanRepository.findByUserIdAndIsActiveTrue(USER_ID)).thenReturn(Optional.of(existingPlan));

        SavePersonalizedRoadmapRequest request = new SavePersonalizedRoadmapRequest(
                "My Plan", "product_sde", LocalDate.now(), 60, 2, Map.of("test", true)
        );

        assertThatThrownBy(() -> service.saveRoadmap(USER_ID, request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("modified in another session");
    }

    @Test
    @DisplayName("Validation: Non-canonical problem IDs are rejected with InvalidRequestException")
    void testNonCanonicalProblemIdRejected() {
        Map<String, Object> badTask = Map.of("id", "task-1", "verniqProblemId", "HACK-9999");
        Map<String, Object> day = Map.of("tasks", List.of(badTask));
        Map<String, Object> week = Map.of("days", List.of(day));
        Map<String, Object> planData = Map.of("weeks", List.of(week));

        SavePersonalizedRoadmapRequest request = new SavePersonalizedRoadmapRequest(
                "Bad Plan", "product_sde", LocalDate.now(), 60, 1, planData
        );

        assertThatThrownBy(() -> service.saveRoadmap(USER_ID, request))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("Invalid canonical problem identifier");
    }

    @Test
    @DisplayName("History Preservation: Plan adjustment preserves completed tasks and timestamps")
    void testPreservesCompletedHistoryOnAdjustment() {
        UserStudyPlan existingPlan = new UserStudyPlan();
        existingPlan.setUserId(USER_ID);
        existingPlan.setVersion(1);
        // Previously completed VRQ-000001
        String oldJson = "{\"weeks\":[{\"days\":[{\"date\":\"2026-10-15\",\"tasks\":[{\"id\":\"t1\",\"verniqProblemId\":\"VRQ-000001\",\"status\":\"completed\",\"completedAt\":\"2026-10-15T12:00:00Z\"}]}]}]}";
        existingPlan.setPlanData(oldJson);

        when(studyPlanRepository.findByUserIdAndIsActiveTrue(USER_ID)).thenReturn(Optional.of(existingPlan));
        when(userProgressService.getUserProblemStatusMap(USER_ID)).thenReturn(Map.of("VRQ-000001", "SOLVED"));
        when(studyPlanRepository.save(any(UserStudyPlan.class))).thenAnswer(inv -> inv.getArgument(0));

        // New adjusted plan without completion flag yet
        Map<String, Object> newTask = new HashMap<>();
        newTask.put("id", "t1-new");
        newTask.put("verniqProblemId", "VRQ-000001");
        newTask.put("status", "upcoming");

        Map<String, Object> newDay = new HashMap<>();
        newDay.put("date", LocalDate.now().toString());
        newDay.put("tasks", new ArrayList<>(List.of(newTask)));

        Map<String, Object> newWeek = new HashMap<>();
        newWeek.put("days", new ArrayList<>(List.of(newDay)));

        Map<String, Object> newPlanData = new HashMap<>();
        newPlanData.put("weeks", new ArrayList<>(List.of(newWeek)));

        SavePersonalizedRoadmapRequest request = new SavePersonalizedRoadmapRequest(
                "Adjusted", "product_sde", LocalDate.now().plusMonths(1), 60, 1, newPlanData
        );

        PersonalizedRoadmapDto result = service.saveRoadmap(USER_ID, request);

        assertThat(result.version()).isEqualTo(2);
        assertThat(result.planData().get("completedTasks")).isEqualTo(1);
    }

    @Test
    @DisplayName("Multi-Roadmap Lifecycle: createNewRoadmap pauses active plans and setRoadmapStatus switches cleanly")
    void testCreateNewAndSwitchStatus() {
        UUID existingId = UUID.randomUUID();
        UUID newId = UUID.randomUUID();

        UserStudyPlan existingActive = new UserStudyPlan();
        existingActive.setId(existingId);
        existingActive.setUserId(USER_ID);
        existingActive.setIsActive(true);
        existingActive.setVersion(2);
        existingActive.setPlanData("{\"status\":\"active\"}");

        when(studyPlanRepository.findAllByUserIdOrderByUpdatedAtDesc(USER_ID)).thenReturn(List.of(existingActive));
        when(userProgressService.getUserProblemStatusMap(USER_ID)).thenReturn(Collections.emptyMap());
        when(studyPlanRepository.save(any(UserStudyPlan.class))).thenAnswer(inv -> {
            UserStudyPlan saved = inv.getArgument(0);
            if (saved.getId() == null) saved.setId(newId);
            return saved;
        });

        SavePersonalizedRoadmapRequest req = new SavePersonalizedRoadmapRequest(
                "FAANG Prep", "product_sde", LocalDate.now().plusWeeks(8), 90, 1,
                new HashMap<>(Map.of("weeks", List.of()))
        );

        PersonalizedRoadmapDto created = service.createNewRoadmap(USER_ID, req);

        assertThat(created.id()).isEqualTo(newId);
        assertThat(created.isActive()).isTrue();
        assertThat(existingActive.getIsActive()).isFalse();

        when(studyPlanRepository.findByIdAndUserId(existingId, USER_ID)).thenReturn(Optional.of(existingActive));
        PersonalizedRoadmapDto reactivated = service.setRoadmapStatus(USER_ID, existingId, "active");
        assertThat(reactivated.isActive()).isTrue();
    }
}
