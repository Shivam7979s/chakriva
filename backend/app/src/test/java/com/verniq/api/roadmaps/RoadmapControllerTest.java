package com.verniq.api.roadmaps;

import com.verniq.api.roadmaps.dto.*;
import com.verniq.api.roadmaps.service.RoadmapService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RoadmapControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RoadmapService roadmapService;

    @Test
    @DisplayName("Security: Unauthenticated roadmap request returns 401 Unauthorized")
    void testUnauthenticatedAccessRejected() throws Exception {
        mockMvc.perform(get("/api/v1/roadmaps"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/roadmaps/dsa-mastery"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/roadmaps/dsa-mastery/progress"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/roadmaps/dsa-mastery/next"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/roadmaps/items/" + UUID.randomUUID() + "/complete"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Roadmap List: Authenticated user receives roadmaps with progress")
    void testAuthenticatedRoadmapList() throws Exception {
        UUID testUserId = UUID.fromString("55555555-5555-5555-5555-555555555555");
        RoadmapSummaryDto summary = new RoadmapSummaryDto(
                UUID.randomUUID(), "DSA Mastery", "dsa-mastery", "Test Desc",
                "~120 Hours", 12, "Compass", 45.0, 9, 20, "IN_PROGRESS"
        );

        when(roadmapService.getRoadmapsSummary(eq(testUserId))).thenReturn(List.of(summary));

        mockMvc.perform(get("/api/v1/roadmaps")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(testUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].slug").value("dsa-mastery"))
                .andExpect(jsonPath("$.data[0].progressPercent").value(45.0));
    }

    @Test
    @DisplayName("Roadmap Progress: Authenticated user receives roadmap node progress")
    void testAuthenticatedRoadmapProgress() throws Exception {
        UUID testUserId = UUID.fromString("55555555-5555-5555-5555-555555555555");
        RoadmapProgressSummaryDto progress = new RoadmapProgressSummaryDto(
                UUID.randomUUID(), "DSA Mastery", "dsa-mastery",
                40, 13, 4, 3, 20, 30, 10, 33.3, "Sprint 1", 1
        );

        when(roadmapService.getRoadmapProgress(eq("dsa-mastery"), eq(testUserId))).thenReturn(progress);

        mockMvc.perform(get("/api/v1/roadmaps/dsa-mastery/progress")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(testUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalNodes").value(40))
                .andExpect(jsonPath("$.data.completedNodes").value(13))
                .andExpect(jsonPath("$.data.progressPercent").value(33.3));
    }

    @Test
    @DisplayName("Next Recommended: Authenticated user receives deterministic next problem")
    void testAuthenticatedNextProblem() throws Exception {
        UUID testUserId = UUID.fromString("55555555-5555-5555-5555-555555555555");
        NextRecommendedProblemDto next = new NextRecommendedProblemDto(
                "VRQ-000001", "two-sum", "Two Sum", "easy", List.of("Array", "Hash Table"),
                "Sprint 1", 1, "Day 1", UUID.randomUUID(), "Solve Two Sum",
                "Next unsolved problem in your current roadmap section"
        );

        when(roadmapService.getNextRecommendedProblem(eq("dsa-mastery"), eq(testUserId))).thenReturn(next);

        mockMvc.perform(get("/api/v1/roadmaps/dsa-mastery/next")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(testUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.problemId").value("VRQ-000001"))
                .andExpect(jsonPath("$.data.slug").value("two-sum"))
                .andExpect(jsonPath("$.data.reason").value("Next unsolved problem in your current roadmap section"));
    }

    @Test
    @DisplayName("Complete Non-Problem Item: Authenticated user can complete concept item")
    void testCompleteNonProblemItem() throws Exception {
        UUID testUserId = UUID.fromString("55555555-5555-5555-5555-555555555555");
        UUID itemId = UUID.randomUUID();
        CompleteItemResponse resp = new CompleteItemResponse(itemId, "COMPLETED", Instant.now(), "Item marked as completed");

        when(roadmapService.completeNonProblemItem(eq(itemId), eq(testUserId))).thenReturn(resp);

        mockMvc.perform(post("/api/v1/roadmaps/items/" + itemId + "/complete")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(testUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }
}
