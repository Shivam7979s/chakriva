package com.verniq.api.progress.controller;

import com.verniq.api.auth.AuthenticatedUser;
import com.verniq.api.common.response.ApiResponse;
import com.verniq.api.progress.dto.ProblemProgressDto;
import com.verniq.api.progress.dto.ProgressSummaryDto;
import com.verniq.api.progress.service.UserProgressService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Controller exposing authenticated user progress, problem status, and learning telemetry.
 */
@RestController
@RequestMapping("/api/v1/progress")
public class ProgressController {

    private final UserProgressService userProgressService;

    public ProgressController(UserProgressService userProgressService) {
        this.userProgressService = userProgressService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ProgressSummaryDto>> getProgress(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        ProgressSummaryDto summary = userProgressService.getProgressSummary(userId);
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<ProgressSummaryDto>> getProgressSummary(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        ProgressSummaryDto summary = userProgressService.getProgressSummary(userId);
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<ProgressSummaryDto>> getProgressStats(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        ProgressSummaryDto summary = userProgressService.getProgressSummary(userId);
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/problems")
    public ResponseEntity<ApiResponse<Map<String, String>>> getUserProblemStatusMap(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        Map<String, String> statusMap = userProgressService.getUserProblemStatusMap(userId);
        return ResponseEntity.ok(ApiResponse.ok(statusMap));
    }

    @GetMapping("/problems/{identifier}")
    public ResponseEntity<ApiResponse<ProblemProgressDto>> getProblemProgress(
            Authentication authentication,
            @PathVariable String identifier) {

        UUID userId = resolveUserId(authentication);
        ProblemProgressDto dto = userProgressService.getProblemProgress(userId, identifier);
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    private UUID resolveUserId(Authentication authentication) {
        if (authentication == null) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required to access user progress");
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
