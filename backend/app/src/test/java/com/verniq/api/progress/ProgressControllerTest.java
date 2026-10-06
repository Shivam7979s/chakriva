package com.verniq.api.progress;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.verniq.api.progress.dto.*;
import com.verniq.api.progress.service.UserProgressService;
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
import java.util.*;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProgressControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserProgressService userProgressService;

    @Test
    @DisplayName("Security: Unauthenticated progress request returns 401 Unauthorized")
    void testUnauthenticatedAccessRejected() throws Exception {
        mockMvc.perform(get("/api/v1/progress/summary"))
            .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/progress/problems/VRQ-000001"))
            .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/progress/problems"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Progress Summary: Authenticated user receives valid progress summary")
    void testAuthenticatedProgressSummary() throws Exception {
        UUID testUserId = UUID.fromString("33333333-3333-3333-3333-333333333333");

        ProgressSummaryDto summary = new ProgressSummaryDto(
            5,
            3,
            2,
            1,
            0,
            10,
            5,
            50.0,
            new DifficultyProgressDto(
                new DifficultyProgressItemDto(2, 3, 10),
                new DifficultyProgressItemDto(1, 2, 15),
                new DifficultyProgressItemDto(0, 0, 5)
            ),
            List.of(new TopicProgressDto("arrays", "Arrays", 2, 3, 10)),
            List.of(new CompanyProgressDto("google", "Google", 1, 2, 5)),
            List.of(new RecentActivityDto(
                UUID.randomUUID(),
                "VRQ-000001",
                "Two Sum",
                "EASY",
                "SOLVED",
                Instant.now()
            ))
        );

        when(userProgressService.getProgressSummary(eq(testUserId))).thenReturn(summary);

        mockMvc.perform(get("/api/v1/progress/summary")
                .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(testUserId.toString())))
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.totalProblemsSolved").value(3))
            .andExpect(jsonPath("$.data.totalProblemsAttempted").value(5))
            .andExpect(jsonPath("$.data.totalSubmissions").value(10))
            .andExpect(jsonPath("$.data.acceptedSubmissions").value(5))
            .andExpect(jsonPath("$.data.submissionAcceptanceRate").value(50.0))
            .andExpect(jsonPath("$.data.difficulty.easy.solved").value(2))
            .andExpect(jsonPath("$.data.topics[0].topicSlug").value("arrays"))
            .andExpect(jsonPath("$.data.companies[0].companySlug").value("google"))
            .andExpect(jsonPath("$.data.recentActivity[0].verniqId").value("VRQ-000001"));
    }

    @Test
    @DisplayName("Problem Progress: Authenticated user receives specific problem progress")
    void testGetProblemProgress() throws Exception {
        UUID testUserId = UUID.fromString("44444444-4444-4444-4444-444444444444");

        ProblemProgressDto dto = new ProblemProgressDto(
            UUID.randomUUID(),
            "VRQ-000001",
            "Two Sum",
            "SOLVED",
            3,
            Instant.now(),
            Instant.now(),
            Instant.now(),
            Instant.now(),
            UUID.randomUUID()
        );

        when(userProgressService.getProblemProgress(eq(testUserId), eq("VRQ-000001"))).thenReturn(dto);

        mockMvc.perform(get("/api/v1/progress/problems/VRQ-000001")
                .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(testUserId.toString())))
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.verniqId").value("VRQ-000001"))
            .andExpect(jsonPath("$.data.status").value("SOLVED"))
            .andExpect(jsonPath("$.data.attemptCount").value(3));
    }

    @Test
    @DisplayName("Problem Status Map: Authenticated user receives fast catalog decoration map")
    void testGetProblemStatusMap() throws Exception {
        UUID testUserId = UUID.fromString("55555555-5555-5555-5555-555555555555");
        Map<String, String> statusMap = Map.of(
            "VRQ-000001", "SOLVED",
            "VRQ-000002", "ATTEMPTED"
        );

        when(userProgressService.getUserProblemStatusMap(eq(testUserId))).thenReturn(statusMap);

        mockMvc.perform(get("/api/v1/progress/problems")
                .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(testUserId.toString())))
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.VRQ-000001").value("SOLVED"))
            .andExpect(jsonPath("$.data.VRQ-000002").value("ATTEMPTED"));
    }
}
