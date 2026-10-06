package com.verniq.api.health;

import com.verniq.api.health.dto.HealthResponse;
import com.verniq.api.health.dto.LivenessResponse;
import com.verniq.api.health.dto.ReadinessResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Health check controller exposing public infrastructure probes according
 * to Verniq Architecture Specification (Sections 11 & 39).
 */
@RestController
@RequestMapping("/api/v1")
public class HealthCheckController {

    private final HealthCheckService healthCheckService;

    public HealthCheckController(HealthCheckService healthCheckService) {
        this.healthCheckService = healthCheckService;
    }

    @GetMapping({"/health", "/health/"})
    public ResponseEntity<HealthResponse> getHealth() {
        return ResponseEntity.ok(healthCheckService.getHealth());
    }

    @GetMapping({"/live", "/health/live"})
    public ResponseEntity<LivenessResponse> getLiveness() {
        return ResponseEntity.ok(healthCheckService.getLiveness());
    }

    @GetMapping({"/ready", "/health/ready"})
    public ResponseEntity<ReadinessResponse> getReadiness() {
        ReadinessResponse readiness = healthCheckService.getReadiness();
        HttpStatus status = "UP".equals(readiness.status()) ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
        return ResponseEntity.status(status).body(readiness);
    }
}
