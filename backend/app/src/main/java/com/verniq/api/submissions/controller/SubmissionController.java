package com.verniq.api.submissions.controller;

import com.verniq.api.auth.AuthenticatedUser;
import com.verniq.api.common.response.ApiResponse;
import com.verniq.api.problems.dto.PageResponse;
import com.verniq.api.submissions.dto.CreateSubmissionRequest;
import com.verniq.api.submissions.dto.SubmissionDetailDto;
import com.verniq.api.submissions.dto.SubmissionResponseDto;
import com.verniq.api.submissions.service.SubmissionService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Controller exposing authenticated submission submission creation, inspection, and history.
 */
@RestController
@RequestMapping("/api/v1/submissions")
public class SubmissionController {

    private final SubmissionService submissionService;

    public SubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SubmissionResponseDto>> createSubmission(
            Authentication authentication,
            @Valid @RequestBody CreateSubmissionRequest request) {

        UUID userId = resolveUserId(authentication);
        SubmissionResponseDto response = submissionService.createSubmission(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SubmissionDetailDto>> getSubmission(
            Authentication authentication,
            @PathVariable UUID id) {

        UUID userId = resolveUserId(authentication);
        SubmissionDetailDto response = submissionService.getSubmissionForUser(id, userId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SubmissionDetailDto>>> listUserSubmissions(
            Authentication authentication,
            @RequestParam(required = false) String problemId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        UUID userId = resolveUserId(authentication);
        int validatedPage = Math.max(0, page);
        int validatedSize = Math.max(1, Math.min(size, 100));

        Page<SubmissionDetailDto> pageResult = submissionService.listUserSubmissions(
            userId, problemId, PageRequest.of(validatedPage, validatedSize)
        );

        return ResponseEntity.ok(ApiResponse.ok(PageResponse.of(pageResult)));
    }

    private UUID resolveUserId(Authentication authentication) {
        if (authentication == null) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required to access submissions");
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
