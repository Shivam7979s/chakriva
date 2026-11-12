package com.verniq.api.roadmaps;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.verniq.api.common.exception.ConflictException;
import com.verniq.api.common.exception.InvalidRequestException;
import com.verniq.api.roadmaps.dto.PersonalizedRoadmapDto;
import com.verniq.api.roadmaps.dto.SavePersonalizedRoadmapRequest;
import com.verniq.api.roadmaps.service.PersonalizedRoadmapService;
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
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PersonalizedRoadmapControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PersonalizedRoadmapService personalizedRoadmapService;

    private static final UUID USER_A = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID USER_B = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Test
    @DisplayName("Security: Unauthenticated personalized roadmap requests return 401 Unauthorized")
    void testUnauthenticatedAccessRejected() throws Exception {
        mockMvc.perform(get("/api/v1/roadmaps/personalized"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/roadmaps/personalized")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planData\":{}}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(put("/api/v1/roadmaps/personalized")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planData\":{}}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/v1/roadmaps/personalized"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Get Roadmap: Authenticated user receives 204 No Content when no plan exists")
    void testGetEmptyRoadmapReturnsNoContent() throws Exception {
        when(personalizedRoadmapService.getActiveRoadmap(eq(USER_A))).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/roadmaps/personalized")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(USER_A.toString()))))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Get Roadmap: Authenticated user receives their saved personalized roadmap")
    void testGetActiveRoadmapReturnsPlan() throws Exception {
        PersonalizedRoadmapDto dto = new PersonalizedRoadmapDto(
                UUID.randomUUID(), USER_A, "Full Stack SDE Roadmap", "product_sde",
                LocalDate.now().plusMonths(3), 60, true, 1,
                Instant.now(), Instant.now(), Map.of("targetRole", "SDE-2", "weeks", java.util.List.of())
        );

        when(personalizedRoadmapService.getActiveRoadmap(eq(USER_A))).thenReturn(Optional.of(dto));

        mockMvc.perform(get("/api/v1/roadmaps/personalized")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(USER_A.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value(USER_A.toString()))
                .andExpect(jsonPath("$.data.title").value("Full Stack SDE Roadmap"))
                .andExpect(jsonPath("$.data.version").value(1));
    }

    @Test
    @DisplayName("Save Roadmap: Authenticated user creates new roadmap and receives 201 Created")
    void testSaveRoadmapSuccess() throws Exception {
        Map<String, Object> planData = Map.of("targetRole", "SDE-1", "progressPercent", 0);
        SavePersonalizedRoadmapRequest request = new SavePersonalizedRoadmapRequest(
                "My Roadmap", "product_sde", LocalDate.now().plusMonths(2), 90, 1, planData
        );

        PersonalizedRoadmapDto responseDto = new PersonalizedRoadmapDto(
                UUID.randomUUID(), USER_A, "My Roadmap", "product_sde",
                LocalDate.now().plusMonths(2), 90, true, 1,
                Instant.now(), Instant.now(), planData
        );

        when(personalizedRoadmapService.saveRoadmap(eq(USER_A), any())).thenReturn(responseDto);

        mockMvc.perform(post("/api/v1/roadmaps/personalized")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(USER_A.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("My Roadmap"))
                .andExpect(jsonPath("$.data.dailyMinutes").value(90));
    }

    @Test
    @DisplayName("Concurrency: Outdated version causes HTTP 409 Conflict")
    void testVersionConflictReturns409() throws Exception {
        SavePersonalizedRoadmapRequest request = new SavePersonalizedRoadmapRequest(
                "Stale Plan", "product_sde", LocalDate.now(), 60, 1, Map.of("version", 1)
        );

        when(personalizedRoadmapService.saveRoadmap(eq(USER_A), any()))
                .thenThrow(new ConflictException("Roadmap was modified in another session"));

        mockMvc.perform(post("/api/v1/roadmaps/personalized")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(USER_A.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CONFLICT"));
    }

    @Test
    @DisplayName("Validation: Invalid canonical problem reference causes 400 Bad Request")
    void testInvalidProblemIdReturns400() throws Exception {
        SavePersonalizedRoadmapRequest request = new SavePersonalizedRoadmapRequest(
                "Bad Plan", "product_sde", LocalDate.now(), 60, 1, Map.of("invalid", true)
        );

        when(personalizedRoadmapService.saveRoadmap(eq(USER_A), any()))
                .thenThrow(new InvalidRequestException("Invalid canonical problem identifier: INVALID-123"));

        mockMvc.perform(post("/api/v1/roadmaps/personalized")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(USER_A.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"));
    }

    @Test
    @DisplayName("Reschedule: Applies approved schedule proposal preserving completed history")
    void testRescheduleEndpointSuccess() throws Exception {
        Map<String, Object> roadmapData = Map.of("totalTasks", 10, "completedTasks", 4);
        PersonalizedRoadmapDto updatedDto = new PersonalizedRoadmapDto(
                UUID.randomUUID(), USER_A, "Rescheduled Plan", "product_sde",
                LocalDate.now().plusMonths(2), 60, true, 2,
                Instant.now(), Instant.now(), roadmapData
        );

        when(personalizedRoadmapService.applyRescheduling(eq(USER_A), any(), any())).thenReturn(updatedDto);

        mockMvc.perform(post("/api/v1/roadmaps/personalized/reschedule")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(USER_A.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\": 1, \"roadmap\": {\"totalTasks\": 10}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.version").value(2));
    }

    @Test
    @DisplayName("User Isolation: User B cannot access or affect User A's roadmap")
    void testUserIsolation() throws Exception {
        when(personalizedRoadmapService.getActiveRoadmap(eq(USER_B))).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/roadmaps/personalized")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(USER_B.toString()))))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Multi-Roadmap: List, create new, pause/resume status, and delete by ID")
    void testMultiRoadmapEndpoints() throws Exception {
        UUID planId = UUID.randomUUID();
        PersonalizedRoadmapDto dto = new PersonalizedRoadmapDto(
                planId, USER_A, "System Design + DSA", "product_sde",
                LocalDate.now().plusWeeks(8), 90, true, 1,
                Instant.now(), Instant.now(), Map.of("status", "active", "weeks", java.util.List.of())
        );

        when(personalizedRoadmapService.listRoadmaps(eq(USER_A))).thenReturn(java.util.List.of(dto));
        when(personalizedRoadmapService.createNewRoadmap(eq(USER_A), any())).thenReturn(dto);
        when(personalizedRoadmapService.setRoadmapStatus(eq(USER_A), eq(planId), eq("paused"))).thenReturn(
                new PersonalizedRoadmapDto(
                        planId, USER_A, "System Design + DSA", "product_sde",
                        LocalDate.now().plusWeeks(8), 90, false, 2,
                        Instant.now(), Instant.now(), Map.of("status", "paused", "weeks", java.util.List.of())
                )
        );

        mockMvc.perform(get("/api/v1/roadmaps/personalized/list")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(USER_A.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(planId.toString()));

        mockMvc.perform(post("/api/v1/roadmaps/personalized/create")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(USER_A.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"System Design + DSA\",\"planData\":{\"weeks\":[]}}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("System Design + DSA"));

        mockMvc.perform(patch("/api/v1/roadmaps/personalized/" + planId + "/status")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(USER_A.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"paused\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(false));

        mockMvc.perform(delete("/api/v1/roadmaps/personalized/" + planId)
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(USER_A.toString()))))
                .andExpect(status().isOk());
    }
}
