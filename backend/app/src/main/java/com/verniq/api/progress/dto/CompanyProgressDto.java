package com.verniq.api.progress.dto;

public record CompanyProgressDto(
    String companySlug,
    String companyName,
    long solved,
    long attempted,
    long total
) {}
