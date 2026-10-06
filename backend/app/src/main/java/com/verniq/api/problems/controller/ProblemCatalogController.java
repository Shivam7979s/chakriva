package com.verniq.api.problems.controller;

import com.verniq.api.common.response.ApiResponse;
import com.verniq.api.problems.domain.ProblemDifficulty;
import com.verniq.api.problems.dto.PageResponse;
import com.verniq.api.problems.dto.ProblemDetailDto;
import com.verniq.api.problems.dto.ProblemFilterCriteria;
import com.verniq.api.problems.dto.ProblemSummaryDto;
import com.verniq.api.problems.service.ProblemCatalogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public, read-only Problem Catalog API Controller.
 *
 * <p>Implements Phase C endpoints according to Sections 17-21 of the Verniq Architecture
 * Baseline v1.0. Exposes only published problems and safe public attributes.</p>
 */
@RestController
@RequestMapping("/api/v1/problems")
public class ProblemCatalogController {

    private final ProblemCatalogService problemCatalogService;

    public ProblemCatalogController(ProblemCatalogService problemCatalogService) {
        this.problemCatalogService = problemCatalogService;
    }

    /**
     * Lists published problems with pagination and optional taxonomy/difficulty filters.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProblemSummaryDto>>> listProblems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) String company,
            @RequestParam(required = false) String search) {

        ProblemDifficulty diff = ProblemDifficulty.fromString(difficulty);
        ProblemFilterCriteria criteria = new ProblemFilterCriteria(diff, topic, company, search);

        PageResponse<ProblemSummaryDto> result = problemCatalogService.listPublishedProblems(criteria, page, size);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * Retrieves full public details of a published problem by its permanent Verniq ID or slug.
     */
    @GetMapping("/{verniqId}")
    public ResponseEntity<ApiResponse<ProblemDetailDto>> getProblem(
            @PathVariable String verniqId) {

        ProblemDetailDto detail = problemCatalogService.getPublishedProblem(verniqId);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }
}
