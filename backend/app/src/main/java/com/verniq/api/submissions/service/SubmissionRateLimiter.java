package com.verniq.api.submissions.service;

import com.verniq.api.common.exception.RateLimitExceededException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Server-side rate limiter for submissions.
 * Prevents queue flooding and protects judge resources.
 * Standard policy: max 5 submissions per 30 seconds per user.
 */
@Component
public class SubmissionRateLimiter {

    private static final Logger log = LoggerFactory.getLogger(SubmissionRateLimiter.class);

    private static final int MAX_SUBMISSIONS_PER_WINDOW = 5;
    private static final int WINDOW_SECONDS = 30;
    private static final String KEY_PREFIX = "verniq:ratelimit:submissions:";

    private final StringRedisTemplate redisTemplate;

    // Fallback in-memory rate limiter in case Redis is degraded
    private final Map<UUID, WindowCounter> fallbackMap = new ConcurrentHashMap<>();

    public SubmissionRateLimiter(@Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Checks rate limit for the given user.
     * Throws RateLimitExceededException if user exceeded allowed submissions.
     */
    public void checkLimit(UUID userId) {
        if (userId == null) {
            return;
        }

        if (redisTemplate != null) {
            try {
                String key = KEY_PREFIX + userId;
                Long count = redisTemplate.opsForValue().increment(key);
                if (count != null && count == 1) {
                    redisTemplate.expire(key, Duration.ofSeconds(WINDOW_SECONDS));
                }

                if (count != null && count > MAX_SUBMISSIONS_PER_WINDOW) {
                    Long ttl = redisTemplate.getExpire(key);
                    long retryAfter = (ttl != null && ttl > 0) ? ttl : WINDOW_SECONDS;
                    log.warn("Rate limit exceeded for user: {} (count: {}, retryAfter: {}s)", userId, count, retryAfter);
                    throw new RateLimitExceededException(
                        "You're submitting too frequently. Please wait a moment before trying again.",
                        retryAfter
                    );
                }
                return;
            } catch (RateLimitExceededException rle) {
                throw rle;
            } catch (Exception e) {
                log.warn("Redis error during rate limiting check, falling back to in-memory: {}", e.getMessage());
            }
        }

        // In-memory fallback
        checkInMemoryLimit(userId);
    }

    private void checkInMemoryLimit(UUID userId) {
        long now = System.currentTimeMillis();
        WindowCounter counter = fallbackMap.compute(userId, (k, existing) -> {
            if (existing == null || now - existing.windowStartMs > (WINDOW_SECONDS * 1000L)) {
                return new WindowCounter(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (counter.count.get() > MAX_SUBMISSIONS_PER_WINDOW) {
            long elapsedSeconds = (now - counter.windowStartMs) / 1000;
            long retryAfter = Math.max(1, WINDOW_SECONDS - elapsedSeconds);
            log.warn("In-memory rate limit exceeded for user: {} (count: {}, retryAfter: {}s)",
                userId, counter.count.get(), retryAfter);
            throw new RateLimitExceededException(
                "You're submitting too frequently. Please wait a moment before trying again.",
                retryAfter
            );
        }
    }

    private static class WindowCounter {
        final long windowStartMs;
        final AtomicInteger count;

        WindowCounter(long windowStartMs, AtomicInteger count) {
            this.windowStartMs = windowStartMs;
            this.count = count;
        }
    }
}
