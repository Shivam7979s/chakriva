package com.verniq.api.auth;

import com.verniq.api.auth.dto.UserIdentityResponse;
import com.verniq.api.common.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Authentication and identity controller.
 *
 * <p>Provides verification endpoints for client sessions validating cryptographic
 * tokens against Supabase Auth.</p>
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserIdentityResponse>> getCurrentUser(
            @AuthenticationPrincipal AuthenticatedUser user,
            Authentication authentication) {

        AuthenticatedUser principal = user;
        if (principal == null && authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser authUser) {
            principal = authUser;
        }

        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        List<String> authorityList = principal.authorities().stream()
            .map(GrantedAuthority::getAuthority)
            .toList();

        UserIdentityResponse response = new UserIdentityResponse(
            principal.id(),
            principal.email(),
            principal.role(),
            authorityList
        );

        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
