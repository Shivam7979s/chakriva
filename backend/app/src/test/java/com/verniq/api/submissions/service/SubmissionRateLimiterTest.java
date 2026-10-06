package com.verniq.api.submissions.service;

import com.verniq.api.common.exception.RateLimitExceededException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class SubmissionRateLimiterTest {

    private SubmissionRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        // Null Redis template tests the in-memory fallback rate limiter
        rateLimiter = new SubmissionRateLimiter(null);
    }

    @Test
    void allowsSubmissionsUnderLimit() {
        UUID userId = UUID.randomUUID();

        // 5 submissions allowed within the window
        for (int i = 0; i < 5; i++) {
            assertDoesNotThrow(() -> rateLimiter.checkLimit(userId));
        }
    }

    @Test
    void blocksSubmissionsOverLimit() {
        UUID userId = UUID.randomUUID();

        for (int i = 0; i < 5; i++) {
            rateLimiter.checkLimit(userId);
        }

        // 6th submission should exceed rate limit
        RateLimitExceededException ex = assertThrows(RateLimitExceededException.class, () -> {
            rateLimiter.checkLimit(userId);
        });

        assertTrue(ex.getRetryAfterSeconds() > 0);
        assertTrue(ex.getMessage().contains("You're submitting too frequently"));
    }

    @Test
    void separatesUsersIndependently() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();

        for (int i = 0; i < 5; i++) {
            rateLimiter.checkLimit(userA);
        }

        // userA is blocked
        assertThrows(RateLimitExceededException.class, () -> rateLimiter.checkLimit(userA));

        // userB should still be allowed
        assertDoesNotThrow(() -> rateLimiter.checkLimit(userB));
    }
}
