package com.verniq.api.progress.dto;

import java.time.Instant;
import java.util.UUID;

public record RecentActivityDto(
    UUID problemId,
    String verniqId,
    String problemTitle,
    String difficulty,
    String status,
    Instant timestamp
) {}
