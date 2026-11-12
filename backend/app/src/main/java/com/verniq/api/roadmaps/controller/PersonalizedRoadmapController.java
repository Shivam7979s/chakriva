package com.verniq.api.roadmaps.controller;

import com.verniq.api.auth.AuthenticatedUser;
import com.verniq.api.common.response.ApiResponse;
import com.verniq.api.roadmaps.dto.PersonalizedRoadmapDto;
import com.verniq.api.roadmaps.dto.SavePersonalizedRoadmapRequest;
import com.verniq.api.roadmaps.service.PersonalizedRoadmapService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/roadmaps/personalized")
public class PersonalizedRoadmapController {

    private final PersonalizedRoadmapService personalizedRoadmapService;

    public PersonalizedRoadmapController(PersonalizedRoadmapService personalizedRoadmapService) {
        this.personalizedRoadmapService = personalizedRoadmapService;
    }

    /**
     * Lists all personalized roadmaps (active and paused) owned by the authenticated user.
     */
    @GetMapping("/list")
    public ResponseEntity<ApiResponse<List<PersonalizedRoadmapDto>>> listPersonalizedRoadmaps(
            Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        List<PersonalizedRoadmapDto> plans = personalizedRoadmapService.listRoadmaps(userId);
        return ResponseEntity.ok(ApiResponse.ok(plans));
    }

    /**
     * Retrieves a specific personalized roadmap by ID owned by the authenticated user.
     */
    @GetMapping("/{planId}")
    public ResponseEntity<ApiResponse<PersonalizedRoadmapDto>> getPersonalizedRoadmapById(
            Authentication authentication,
            @PathVariable UUID planId) {
        UUID userId = resolveUserId(authentication);
        PersonalizedRoadmapDto roadmap = personalizedRoadmapService.getRoadmapById(userId, planId);
        return ResponseEntity.ok(ApiResponse.ok(roadmap));
    }

    /**
     * Retrieves the authenticated user's active personalized roadmap.
     * Problem completions are authoritatively reconciled with the judge pipeline.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PersonalizedRoadmapDto>> getPersonalizedRoadmap(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        Optional<PersonalizedRoadmapDto> roadmapOpt = personalizedRoadmapService.getActiveRoadmap(userId);

        if (roadmapOpt.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(ApiResponse.ok(roadmapOpt.get()));
    }

    /**
     * Creates a distinct new personalized roadmap, pausing any previously active plan.
     */
    @PostMapping("/create")
    public ResponseEntity<ApiResponse<PersonalizedRoadmapDto>> createNewPersonalizedRoadmap(
            Authentication authentication,
            @Valid @RequestBody SavePersonalizedRoadmapRequest request) {
        UUID userId = resolveUserId(authentication);
        PersonalizedRoadmapDto created = personalizedRoadmapService.createNewRoadmap(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(created));
    }

    /**
     * Saves or replaces the authenticated user's personalized roadmap.
     * Detects version conflicts and enforces problem canonical validation.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<PersonalizedRoadmapDto>> savePersonalizedRoadmap(
            Authentication authentication,
            @Valid @RequestBody SavePersonalizedRoadmapRequest request) {
        UUID userId = resolveUserId(authentication);
        PersonalizedRoadmapDto saved = personalizedRoadmapService.saveRoadmap(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(saved));
    }

    /**
     * Updates a specific saved roadmap by ID.
     */
    @PutMapping("/{planId}")
    public ResponseEntity<ApiResponse<PersonalizedRoadmapDto>> updatePersonalizedRoadmapById(
            Authentication authentication,
            @PathVariable UUID planId,
            @Valid @RequestBody SavePersonalizedRoadmapRequest request) {
        UUID userId = resolveUserId(authentication);
        PersonalizedRoadmapDto updated = personalizedRoadmapService.updateRoadmapById(userId, planId, request);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    /**
     * Updates an existing roadmap's preferences or plan tasks.
     */
    @PutMapping
    public ResponseEntity<ApiResponse<PersonalizedRoadmapDto>> updatePersonalizedRoadmap(
            Authentication authentication,
            @Valid @RequestBody SavePersonalizedRoadmapRequest request) {
        UUID userId = resolveUserId(authentication);
        PersonalizedRoadmapDto updated = personalizedRoadmapService.saveRoadmap(userId, request);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    /**
     * Updates a specific roadmap's lifecycle status ('active' or 'paused').
     */
    @PatchMapping("/{planId}/status")
    public ResponseEntity<ApiResponse<PersonalizedRoadmapDto>> updateRoadmapStatus(
            Authentication authentication,
            @PathVariable UUID planId,
            @RequestBody Map<String, String> body) {
        UUID userId = resolveUserId(authentication);
        String status = body != null ? body.get("status") : null;
        PersonalizedRoadmapDto updated = personalizedRoadmapService.setRoadmapStatus(userId, planId, status);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    /**
     * Updates editable roadmap preferences (role, pacing, availability, timeline).
     */
    @PatchMapping("/preferences")
    public ResponseEntity<ApiResponse<PersonalizedRoadmapDto>> updatePreferences(
            Authentication authentication,
            @RequestBody Map<String, Object> body) {
        UUID userId = resolveUserId(authentication);
        @SuppressWarnings("unchecked")
        Map<String, Object> preferences = (Map<String, Object>) body.getOrDefault("preferences", body);
        Integer clientVersion = body.get("version") instanceof Number n ? n.intValue() : null;

        PersonalizedRoadmapDto updated = personalizedRoadmapService.updatePreferences(userId, preferences, clientVersion);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    /**
     * Applies an approved schedule recalculation proposal while strictly preserving completed history.
     */
    @PostMapping("/reschedule")
    public ResponseEntity<ApiResponse<PersonalizedRoadmapDto>> applyRescheduling(
            Authentication authentication,
            @RequestBody Map<String, Object> body) {
        UUID userId = resolveUserId(authentication);
        @SuppressWarnings("unchecked")
        Map<String, Object> fullRoadmapData = (Map<String, Object>) body.getOrDefault("roadmap", body);
        Integer clientVersion = body.get("version") instanceof Number n ? n.intValue() : null;

        PersonalizedRoadmapDto updated = personalizedRoadmapService.applyRescheduling(userId, fullRoadmapData, clientVersion);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    /**
     * Deletes or deactivates the authenticated user's current personalized roadmap.
     */
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deletePersonalizedRoadmap(Authentication authentication) {
        UUID userId = resolveUserId(authentication);
        personalizedRoadmapService.deleteActiveRoadmap(userId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /**
     * Permanently deletes a specific saved roadmap owned by the authenticated user.
     */
    @DeleteMapping("/{planId}")
    public ResponseEntity<ApiResponse<Void>> deletePersonalizedRoadmapById(
            Authentication authentication,
            @PathVariable UUID planId) {
        UUID userId = resolveUserId(authentication);
        personalizedRoadmapService.deleteRoadmapById(userId, planId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    private UUID resolveUserId(Authentication authentication) {
        if (authentication == null) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required to access personalized roadmap");
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
            throw new AuthenticationCredentialsNotFoundException("Invalid user identity in authentication context");
        }
    }
}
