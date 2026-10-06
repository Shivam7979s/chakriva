package com.verniq.api.roadmaps.controller;

import com.verniq.api.auth.AuthenticatedUser;
import com.verniq.api.common.response.ApiResponse;
import com.verniq.api.roadmaps.dto.*;
import com.verniq.api.roadmaps.service.RoadmapService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/roadmaps")
public class RoadmapController {

    private final RoadmapService roadmapService;

    public RoadmapController(RoadmapService roadmapService) {
        this.roadmapService = roadmapService;
    }

    /**
     * Lists published roadmaps with authenticated user's progress.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<RoadmapSummaryDto>>> getRoadmaps(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        List<RoadmapSummaryDto> summaries = roadmapService.getRoadmapsSummary(userId);
        return ResponseEntity.ok(ApiResponse.ok(summaries));
    }

    /**
     * Returns full roadmap tree with evaluated server-authoritative node states.
     */
    @GetMapping("/{slugOrId}")
    public ResponseEntity<ApiResponse<RoadmapDetailDto>> getRoadmapDetail(
            Authentication authentication,
            @PathVariable String slugOrId) {
        UUID userId = resolveUserId(authentication);
        RoadmapDetailDto detail = roadmapService.getRoadmapDetail(slugOrId, userId);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    /**
     * Exposes roadmap-level progress (node counts and completion percentage).
     */
    @GetMapping("/{slugOrId}/progress")
    public ResponseEntity<ApiResponse<RoadmapProgressSummaryDto>> getRoadmapProgress(
            Authentication authentication,
            @PathVariable String slugOrId) {
        UUID userId = resolveUserId(authentication);
        RoadmapProgressSummaryDto progress = roadmapService.getRoadmapProgress(slugOrId, userId);
        return ResponseEntity.ok(ApiResponse.ok(progress));
    }

    /**
     * Deterministic next recommended problem endpoint.
     */
    @GetMapping("/{slugOrId}/next")
    public ResponseEntity<ApiResponse<NextRecommendedProblemDto>> getNextRecommendedProblem(
            Authentication authentication,
            @PathVariable String slugOrId) {
        UUID userId = resolveUserId(authentication);
        NextRecommendedProblemDto next = roadmapService.getNextRecommendedProblem(slugOrId, userId);
        if (next == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(ApiResponse.ok(next));
    }

    /**
     * Completes a non-problem item (Concept, Reading, Lecture, Revision).
     * Note: Problem items are rejected by service and must be completed via judge pipeline.
     */
    @PostMapping("/items/{itemId}/complete")
    public ResponseEntity<ApiResponse<CompleteItemResponse>> completeItem(
            Authentication authentication,
            @PathVariable UUID itemId) {
        UUID userId = resolveUserId(authentication);
        CompleteItemResponse resp = roadmapService.completeNonProblemItem(itemId, userId);
        return ResponseEntity.ok(ApiResponse.ok(resp));
    }

    private UUID resolveUserId(Authentication authentication) {
        if (authentication == null) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required to access roadmap progress");
        }
        if (authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user.id();
        }
        if (authentication.getPrincipal() instanceof Jwt jwt) {
            return UUID.fromString(jwt.getSubject());
        }
        try {
            return UUID.fromString(authentication.getName());
        } catch (IllegalArgumentException e) {
            return UUID.nameUUIDFromBytes(authentication.getName().getBytes());
        }
    }
}
