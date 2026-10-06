package com.verniq.api.progress.dto;

public record DifficultyProgressDto(
    DifficultyProgressItemDto easy,
    DifficultyProgressItemDto medium,
    DifficultyProgressItemDto hard
) {}
