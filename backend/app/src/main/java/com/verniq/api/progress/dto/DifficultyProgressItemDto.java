package com.verniq.api.progress.dto;

public record DifficultyProgressItemDto(
    long solved,
    long attempted,
    long total
) {}
