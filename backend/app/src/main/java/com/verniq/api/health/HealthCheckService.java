package com.verniq.api.health;

import com.verniq.api.common.config.ApplicationProperties;
import com.verniq.api.health.dto.HealthResponse;
import com.verniq.api.health.dto.LivenessResponse;
import com.verniq.api.health.dto.ReadinessResponse;
import com.verniq.api.health.indicator.DatabaseReadinessIndicator;
import com.verniq.api.health.indicator.RedisReadinessIndicator;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class HealthCheckService {

    private final ApplicationProperties applicationProperties;
    private final DatabaseReadinessIndicator databaseIndicator;
    private final RedisReadinessIndicator redisIndicator;

    public HealthCheckService(ApplicationProperties applicationProperties,
                              DatabaseReadinessIndicator databaseIndicator,
                              RedisReadinessIndicator redisIndicator) {
        this.applicationProperties = applicationProperties;
        this.databaseIndicator = databaseIndicator;
        this.redisIndicator = redisIndicator;
    }

    public HealthResponse getHealth() {
        return new HealthResponse(
            "UP",
            applicationProperties.name(),
            applicationProperties.version(),
            Instant.now()
        );
    }

    public LivenessResponse getLiveness() {
        // Process is executing and responsive
        return new LivenessResponse("UP", Instant.now());
    }

    public ReadinessResponse getReadiness() {
        boolean dbReady = databaseIndicator.isReady();
        boolean redisReady = redisIndicator.isReady();

        Map<String, String> components = new LinkedHashMap<>();
        components.put("database", dbReady ? "UP" : "DOWN");
        components.put("redis", redisReady ? "UP" : "DOWN");

        String overallStatus = (dbReady && redisReady) ? "UP" : "DOWN";

        return new ReadinessResponse(
            overallStatus,
            Instant.now(),
            components
        );
    }
}
