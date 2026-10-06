package com.verniq.api.problems.dto;

import com.verniq.api.problems.domain.ProblemDifficulty;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import java.util.UUID;

/**
 * Public problem detail DTO for solving interface and problem viewer.
 *
 * <p>Exposes only public statements, constraints, sample examples, and starter templates.
 * Hidden canonical test suites and judge evaluation configs are strictly omitted.</p>
 */
public record ProblemDetailDto(
    UUID id,
    String verniqId,
    String title,
    String slug,
    ProblemDifficulty difficulty,
    Double acceptanceRate,
    String statement,
    String constraints,
    List<ExampleDto> examples,
    Map<String, String> starterTemplates,
    List<String> topics,
    List<String> companies,
    int currentVersion,
    Instant publishedAt
) {}
