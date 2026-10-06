package com.verniq.api.auth.dto;

import java.util.List;
import java.util.UUID;

/**
 * Public authenticated identity payload returned by /api/v1/auth/me.
 *
 * <p>Never exposes raw JWT access tokens, passwords, or sensitive internal claims.</p>
 */
public record UserIdentityResponse(
    UUID id,
    String email,
    String role,
    List<String> authorities
) {}
