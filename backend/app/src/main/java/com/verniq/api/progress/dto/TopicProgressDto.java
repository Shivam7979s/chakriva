package com.verniq.api.progress.dto;

public record TopicProgressDto(
    String topicSlug,
    String topicName,
    long solved,
    long attempted,
    long total
) {}
