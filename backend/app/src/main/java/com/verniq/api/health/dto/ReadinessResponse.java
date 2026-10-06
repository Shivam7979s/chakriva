package com.verniq.api.health.dto;

import java.time.Instant;
import java.util.Map;

public record ReadinessResponse(
    String status,
    Instant timestamp,
    Map<String, String> components
) {}
