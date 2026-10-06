package com.verniq.api.health.indicator;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.stereotype.Component;

@Component
public class RedisReadinessIndicator {

    private static final Logger log = LoggerFactory.getLogger(RedisReadinessIndicator.class);
    private final RedisConnectionFactory connectionFactory;

    public RedisReadinessIndicator(@Autowired(required = false) RedisConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    public boolean isReady() {
        if (connectionFactory == null) {
            return false;
        }
        try (RedisConnection conn = connectionFactory.getConnection()) {
            String pingResult = conn.ping();
            return "PONG".equalsIgnoreCase(pingResult);
        } catch (Exception e) {
            log.warn("Redis readiness check failed: {}", e.getMessage());
            return false;
        }
    }
}
