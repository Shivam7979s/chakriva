package com.verniq.api.problems.dto;

import com.verniq.api.problems.domain.ProblemDifficulty;
import java.util.List;

/**
 * Public problem summary DTO for catalog listing.
 *
 * <p>Never exposes hidden tests, reference solutions, judge internals, or private authoring notes.</p>
 */
public record ProblemSummaryDto(
    String verniqId,
    String title,
    String slug,
    ProblemDifficulty difficulty,
    Double acceptanceRate,
    List<String> topics,
    List<String> companies
) {}
