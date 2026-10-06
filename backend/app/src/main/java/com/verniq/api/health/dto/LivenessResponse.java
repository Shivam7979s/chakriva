package com.verniq.api.health.dto;

import java.time.Instant;

public record LivenessResponse(
    String status,
    Instant timestamp
) {}
