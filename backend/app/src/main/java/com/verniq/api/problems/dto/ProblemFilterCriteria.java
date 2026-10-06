package com.verniq.api.problems.dto;

import com.verniq.api.problems.domain.ProblemDifficulty;

/**
 * Filter criteria for problem catalog queries.
 */
public record ProblemFilterCriteria(
    ProblemDifficulty difficulty,
    String topic,
    String company,
    String search
) {}
