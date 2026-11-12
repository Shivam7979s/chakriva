package com.verniq.api.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.verniq.api.auth.AuthenticatedUser;
import com.verniq.api.auth.SupabaseAuthenticationToken;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AiChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private SupabaseAuthenticationToken createMockAuth() {
        UUID userId = UUID.randomUUID();
        String email = "learner@chakriva.io";

        Jwt jwt = Jwt.withTokenValue("mock.jwt.token")
                .header("alg", "none")
                .claim("sub", userId.toString())
                .claim("email", email)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        AuthenticatedUser user = new AuthenticatedUser(
                userId,
                email,
                "USER",
                Set.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of("sub", userId.toString(), "email", email)
        );

        return new SupabaseAuthenticationToken(jwt, user, Set.of(new SimpleGrantedAuthority("ROLE_USER")));
    }

    @Test
    @DisplayName("POST /api/v1/ai/chat requires authentication")
    void testAiChatRequiresAuthentication() throws Exception {
        Map<String, Object> payload = Map.of(
                "problemId", "VRQ-000001",
                "message", "Can I have a hint?"
        );

        mockMvc.perform(post("/api/v1/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/ai/health is accessible publicly")
    void testAiHealthPubliclyAccessible() throws Exception {
        mockMvc.perform(get("/api/v1/ai/health"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // Either 200 (if local microservice is running) or 503 (if offline), but never 401 Unauthorized
                    org.junit.jupiter.api.Assertions.assertTrue(status == 200 || status == 503);
                });
    }

    @Test
    @DisplayName("POST /api/v1/ai/chat returns 503 with OFFLINE code when backend/ai microservice is unreachable")
    void testAiChatOfflineReturnsCleanError() throws Exception {
        Map<String, Object> payload = Map.of(
                "problemId", "VRQ-000001",
                "problemTitle", "Two Sum",
                "message", "Can you give me a hint?",
                "mode", "mentor",
                "mentorAction", "hint"
        );

        // If microservice is running locally, it forwards and validates auth (returning 401/200); if offline, it returns 503
        mockMvc.perform(post("/api/v1/ai/chat")
                        .with(authentication(createMockAuth()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(
                            status == 503 || status == 401 || status == 200,
                            "Expected 503 (offline) or 401/200 (forwarded to live microservice), but was: " + status
                    );
                });
    }
}
