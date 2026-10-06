package com.verniq.api.common.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.equalTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Unauthenticated request to protected resource returns standard 401 JSON ErrorResponse")
    void testUnauthenticatedAccessReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/protected-resource"))
            .andExpect(status().isUnauthorized())
            .andExpect(header().exists("X-Request-ID"))
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.path").value("/api/v1/protected-resource"))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    @DisplayName("Public health endpoints bypass authentication")
    void testPublicHealthEndpointsPermitted() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));

        mockMvc.perform(get("/api/v1/health/live"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("Public actuator health probe bypasses authentication")
    void testActuatorHealthPermitted() throws Exception {
        mockMvc.perform(get("/actuator/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }
}
