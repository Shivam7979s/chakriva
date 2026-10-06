package com.verniq.api.analytics.controller;

import com.verniq.api.analytics.dto.*;
import com.verniq.api.analytics.service.AnalyticsService;
import com.verniq.api.auth.AuthenticatedUser;
import com.verniq.api.common.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST controller exposing server-authoritative product intelligence,
 * performance statistics, learning velocity, and deterministic insights.
 */
@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AnalyticsOverviewDto>> getOverview(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        AnalyticsOverviewDto overview = analyticsService.getOverview(userId);
        return ResponseEntity.ok(ApiResponse.ok(overview));
    }

    @GetMapping("/difficulty")
    public ResponseEntity<ApiResponse<DifficultyAnalyticsDto>> getDifficulty(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        DifficultyAnalyticsDto difficulty = analyticsService.getDifficultyAnalytics(userId);
        return ResponseEntity.ok(ApiResponse.ok(difficulty));
    }

    @GetMapping("/topics")
    public ResponseEntity<ApiResponse<List<TopicAnalyticsDto>>> getTopics(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        List<TopicAnalyticsDto> topics = analyticsService.getTopicAnalytics(userId);
        return ResponseEntity.ok(ApiResponse.ok(topics));
    }

    @GetMapping("/companies")
    public ResponseEntity<ApiResponse<List<CompanyAnalyticsDto>>> getCompanies(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        List<CompanyAnalyticsDto> companies = analyticsService.getCompanyAnalytics(userId);
        return ResponseEntity.ok(ApiResponse.ok(companies));
    }

    @GetMapping("/trends")
    public ResponseEntity<ApiResponse<List<TrendPointDto>>> getTrends(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        List<TrendPointDto> trends = analyticsService.getTrends(userId);
        return ResponseEntity.ok(ApiResponse.ok(trends));
    }

    private UUID resolveUserId(Authentication authentication) {
        if (authentication == null) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required to access analytics");
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
