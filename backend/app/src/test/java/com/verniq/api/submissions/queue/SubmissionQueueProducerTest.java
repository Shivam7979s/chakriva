package com.verniq.api.submissions.queue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.verniq.api.common.exception.ServiceUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SubmissionQueueProducerTest {

    @Test
    void throwsServiceUnavailableWhenRedisTemplateIsNull() {
        SubmissionQueueProducer producer = new SubmissionQueueProducer(null, null, new ObjectMapper());
        JudgeJobPayload payload = JudgeJobPayload.of(
            "job_1", "sub_1", "prob_1", "VRQ-000001", 1, "java", "class S{}", 2000, 256
        );

        ServiceUnavailableException ex = assertThrows(ServiceUnavailableException.class, () -> {
            producer.enqueue(payload);
        });

        assertTrue(ex.getMessage().contains("unavailable"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void throwsServiceUnavailableWhenRedisThrowsException() {
        StringRedisTemplate mockRedis = mock(StringRedisTemplate.class);
        ListOperations<String, String> mockOps = mock(ListOperations.class);
        when(mockRedis.opsForList()).thenReturn(mockOps);
        when(mockOps.rightPush(any(), any())).thenThrow(new RuntimeException("Redis connection refused"));

        SubmissionQueueProducer producer = new SubmissionQueueProducer(mockRedis, null, new ObjectMapper());
        JudgeJobPayload payload = JudgeJobPayload.of(
            "job_1", "sub_1", "prob_1", "VRQ-000001", 1, "java", "class S{}", 2000, 256
        );

        ServiceUnavailableException ex = assertThrows(ServiceUnavailableException.class, () -> {
            producer.enqueue(payload);
        });

        assertTrue(ex.getMessage().contains("unreachable"));
    }
}
