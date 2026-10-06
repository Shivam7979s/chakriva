package com.verniq.api.auth;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    private static final String TEST_SECRET = "test-secret-key-at-least-32-chars-long-for-hs256!";
    private static final String WRONG_SECRET = "wrong-secret-key-at-least-32-chars-long-hs256!";

    @Autowired
    private MockMvc mockMvc;

    private String createSignedJwt(UUID userId, String email, String role, boolean expired, String secret) throws Exception {
        Instant now = Instant.now();
        Instant exp = expired ? now.minusSeconds(3600) : now.plusSeconds(3600);

        JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
            .subject(userId.toString())
            .claim("email", email)
            .claim("aud", "authenticated")
            .issueTime(Date.from(now))
            .expirationTime(Date.from(exp));

        if (role != null) {
            builder.claim("app_metadata", Map.of("role", role));
        }

        SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), builder.build());
        signedJWT.sign(new MACSigner(secret));
        return signedJWT.serialize();
    }

    @Test
    @DisplayName("GET /api/v1/auth/me returns 401 when Authorization header is missing")
    void testMissingAuthorizationHeaderReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
            .andExpect(status().isUnauthorized())
            .andExpect(header().exists("X-Request-ID"))
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.path").value("/api/v1/auth/me"))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    @DisplayName("GET /api/v1/auth/me returns 401 when Bearer token is malformed")
    void testMalformedBearerTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer not-a-valid-jwt-token"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    @DisplayName("GET /api/v1/auth/me returns 401 when JWT signature is invalid")
    void testInvalidSignatureReturns401() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = createSignedJwt(userId, "user@verniq.io", "student", false, WRONG_SECRET);

        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    @DisplayName("GET /api/v1/auth/me returns 401 when JWT is expired")
    void testExpiredJwtReturns401() throws Exception {
        UUID userId = UUID.randomUUID();
        String token = createSignedJwt(userId, "user@verniq.io", "student", true, TEST_SECRET);

        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    @DisplayName("GET /api/v1/auth/me returns 200 with authenticated identity when JWT is valid")
    void testValidJwtReturnsAuthenticatedIdentity() throws Exception {
        UUID userId = UUID.randomUUID();
        String email = "student@verniq.io";
        String token = createSignedJwt(userId, email, "student", false, TEST_SECRET);

        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + token)
                .header("X-Request-ID", "custom-auth-req-123"))
            .andExpect(status().isOk())
            .andExpect(header().string("X-Request-ID", "custom-auth-req-123"))
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").value(userId.toString()))
            .andExpect(jsonPath("$.data.email").value(email))
            .andExpect(jsonPath("$.data.role").value("STUDENT"))
            .andExpect(jsonPath("$.data.authorities", hasItem("ROLE_USER")))
            .andExpect(jsonPath("$.data.authorities", hasItem("ROLE_STUDENT")));
    }

    @Test
    @DisplayName("GET /api/v1/auth/me derives admin authority from app_metadata role claim")
    void testAdminRoleDerivedFromAppMetadata() throws Exception {
        UUID adminId = UUID.randomUUID();
        String email = "admin@verniq.io";
        String token = createSignedJwt(adminId, email, "admin", false, TEST_SECRET);

        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").value(adminId.toString()))
            .andExpect(jsonPath("$.data.role").value("ADMIN"))
            .andExpect(jsonPath("$.data.authorities", hasItem("ROLE_ADMIN")));
    }
}
