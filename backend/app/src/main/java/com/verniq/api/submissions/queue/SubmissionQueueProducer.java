package com.verniq.api.submissions.queue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.verniq.api.common.exception.ServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Production Judge Queue Producer.
 *
 * <p>Publishes serialized JudgeJob payloads atomically to the designated Redis
 * submission queue (RPUSH) for consumption by isolated AWS judge workers.</p>
 *
 * <p>Guarantees:
 * <ul>
 *   <li>Database remains the authoritative source of truth.</li>
 *   <li>Payload strictly conforms to Phase J.5.1 JudgeJob contractVersion "1".</li>
 *   <li>Source code, credentials, and hidden tests are never logged or exposed.</li>
 *   <li>Queue unreachable failures throw ServiceUnavailableException with structured server-side logging.</li>
 * </ul>
 * </p>
 */
@Component
public class SubmissionQueueProducer {

    private static final Logger log = LoggerFactory.getLogger(SubmissionQueueProducer.class);
    public static final String DEFAULT_QUEUE_KEY = "verniq:submissions:queue";

    private final StringRedisTemplate stringRedisTemplate;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;
    private final String queueKey;

    public SubmissionQueueProducer(
            @Autowired(required = false) StringRedisTemplate stringRedisTemplate,
            @Autowired(required = false) RedisTemplate<String, Object> redisTemplate,
            ObjectMapper objectMapper
    ) {
        this(stringRedisTemplate, redisTemplate, objectMapper, DEFAULT_QUEUE_KEY);
    }

    @Autowired
    public SubmissionQueueProducer(
            @Autowired(required = false) StringRedisTemplate stringRedisTemplate,
            @Autowired(required = false) RedisTemplate<String, Object> redisTemplate,
            ObjectMapper objectMapper,
            @Value("${verniq.judge.queue-name:verniq:submissions:queue}") String queueKey
    ) {
        this.stringRedisTemplate = stringRedisTemplate;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.queueKey = (queueKey != null && !queueKey.isBlank()) ? queueKey.trim() : DEFAULT_QUEUE_KEY;
    }

    /**
     * Publishes a validated JudgeJob payload to the Redis submission queue atomically.
     *
     * @param job canonical JudgeJob payload
     * @throws ServiceUnavailableException if Redis is unreachable or publication fails
     */
    public void enqueue(JudgeJobPayload job) {
        if (job == null) {
            throw new IllegalArgumentException("JudgeJobPayload cannot be null");
        }

        if (stringRedisTemplate == null && redisTemplate == null) {
            log.error("Redis template unavailable. Cannot publish job {} (submission: {}) to queue {}",
                job.jobId(), job.submissionId(), queueKey);
            throw new ServiceUnavailableException("Submission queue is currently unavailable. Please try again shortly.");
        }

        try {
            long startTime = System.currentTimeMillis();
            String jsonPayload = objectMapper.writeValueAsString(job);
            Long queueLength;

            if (stringRedisTemplate != null) {
                queueLength = stringRedisTemplate.opsForList().rightPush(queueKey, jsonPayload);
            } else {
                queueLength = redisTemplate.opsForList().rightPush(queueKey, jsonPayload);
            }

            long durationMs = System.currentTimeMillis() - startTime;
            log.info("Published JudgeJob {} for submission {} to Redis queue {} (mode: {}, lang: {}, depth: {}, elapsed: {}ms)",
                job.jobId(), job.submissionId(), queueKey, job.mode(), job.language(), queueLength, durationMs);

        } catch (Exception e) {
            log.error("Failed to publish JudgeJob {} for submission {} to Redis queue {}: {}",
                job.jobId(), job.submissionId(), queueKey, e.getMessage());
            throw new ServiceUnavailableException("Submission queue is currently unreachable. Please try again shortly.");
        }
    }

    /**
     * Returns the configured queue namespace.
     */
    public String getQueueName() {
        return queueKey;
    }

    public String getQueueKey() {
        return queueKey;
    }

    /**
     * Queries current queue depth.
     */
    public Long getQueueDepth() {
        try {
            if (stringRedisTemplate != null) {
                Long size = stringRedisTemplate.opsForList().size(queueKey);
                return size != null ? size : 0L;
            } else if (redisTemplate != null) {
                Long size = redisTemplate.opsForList().size(queueKey);
                return size != null ? size : 0L;
            }
            return 0L;
        } catch (Exception e) {
            log.warn("Failed to check Redis queue depth on {}: {}", queueKey, e.getMessage());
            return 0L;
        }
    }
}
