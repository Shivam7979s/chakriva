package com.verniq.api.common.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("400 VALIDATION_ERROR: Returns standard ErrorResponse with field details")
    void testValidationFailure() throws Exception {
        String invalidJson = """
            {
                "title": "",
                "score": null
            }
            """;

        mockMvc.perform(post("/api/v1/test/validation")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidJson))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
            .andExpect(jsonPath("$.error.details", hasSize(greaterThanOrEqualTo(1))))
            .andExpect(jsonPath("$.path").value("/api/v1/test/validation"))
            .andExpect(jsonPath("$.requestId", startsWith("req_")))
            .andExpect(jsonPath("$.timestamp").exists())
            // Guarantee internal stack traces are never exposed
            .andExpect(jsonPath("$.stackTrace").doesNotExist())
            .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    @DisplayName("400 BAD_REQUEST: Returns standard ErrorResponse for malformed JSON")
    void testMalformedJson() throws Exception {
        mockMvc.perform(post("/api/v1/test/validation")
                .contentType(MediaType.APPLICATION_JSON)
                .content("not-json"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    @DisplayName("404 RESOURCE_NOT_FOUND: Returns standard ErrorResponse for missing resource")
    void testResourceNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/test/not-found"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"))
            .andExpect(jsonPath("$.error.message", containsString("VRQ-999999")))
            .andExpect(jsonPath("$.path").value("/api/v1/test/not-found"))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    @DisplayName("403 FORBIDDEN: Returns standard ErrorResponse for forbidden access")
    void testForbiddenError() throws Exception {
        mockMvc.perform(get("/api/v1/test/forbidden"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
            .andExpect(jsonPath("$.path").value("/api/v1/test/forbidden"))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    @DisplayName("500 INTERNAL_SERVER_ERROR: Returns generic safe message without leaking stack trace")
    void testInternalServerErrorSafeMessage() throws Exception {
        mockMvc.perform(get("/api/v1/test/server-error"))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("INTERNAL_SERVER_ERROR"))
            .andExpect(jsonPath("$.error.message", not(containsString("Simulated unexpected"))))
            .andExpect(jsonPath("$.path").value("/api/v1/test/server-error"))
            .andExpect(jsonPath("$.requestId").exists())
            // Never expose traces to clients
            .andExpect(jsonPath("$.stackTrace").doesNotExist())
            .andExpect(jsonPath("$.trace").doesNotExist());
    }
}
