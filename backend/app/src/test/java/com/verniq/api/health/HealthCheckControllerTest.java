package com.verniq.api.health;

import com.verniq.api.health.indicator.DatabaseReadinessIndicator;
import com.verniq.api.health.indicator.RedisReadinessIndicator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HealthCheckControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DatabaseReadinessIndicator databaseIndicator;

    @MockBean
    private RedisReadinessIndicator redisIndicator;

    @Test
    @DisplayName("GET /api/v1/health returns general service info with UP status")
    void testHealthEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"))
            .andExpect(jsonPath("$.service").value("verniq-api"))
            .andExpect(jsonPath("$.version").value("1.0.0"))
            .andExpect(jsonPath("$.timestamp").exists())
            .andExpect(header().exists("X-Request-ID"));
    }

    @Test
    @DisplayName("GET /api/v1/health/live returns process liveness status")
    void testLivenessEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/health/live"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"))
            .andExpect(jsonPath("$.timestamp").exists())
            .andExpect(header().exists("X-Request-ID"));
    }

    @Test
    @DisplayName("GET /api/v1/health/ready returns 200 UP when dependencies are ready")
    void testReadinessEndpointUp() throws Exception {
        when(databaseIndicator.isReady()).thenReturn(true);
        when(redisIndicator.isReady()).thenReturn(true);

        mockMvc.perform(get("/api/v1/health/ready"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"))
            .andExpect(jsonPath("$.components.database").value("UP"))
            .andExpect(jsonPath("$.components.redis").value("UP"));
    }

    @Test
    @DisplayName("GET /api/v1/health/ready returns 503 SERVICE_UNAVAILABLE when a dependency is down")
    void testReadinessEndpointDown() throws Exception {
        when(databaseIndicator.isReady()).thenReturn(false);
        when(redisIndicator.isReady()).thenReturn(true);

        mockMvc.perform(get("/api/v1/health/ready"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.status").value("DOWN"))
            .andExpect(jsonPath("$.components.database").value("DOWN"))
            .andExpect(jsonPath("$.components.redis").value("UP"));
    }
}
