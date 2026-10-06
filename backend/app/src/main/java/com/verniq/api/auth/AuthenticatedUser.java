package com.verniq.api.auth;

import org.springframework.security.core.GrantedAuthority;

import java.io.Serializable;
import java.util.Collection;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

/**
 * Clean application-level representation of an authenticated Supabase user.
 *
 * <p>Provides decoupled access to identity, roles, and claims without leaking
 * low-level Spring Security OAuth2 implementation details into business services.</p>
 */
public record AuthenticatedUser(
    UUID id,
    String email,
    String role,
    Collection<? extends GrantedAuthority> authorities,
    Map<String, Object> claims
) implements Serializable {

    public AuthenticatedUser {
        authorities = authorities == null ? Collections.emptyList() : Collections.unmodifiableCollection(authorities);
        claims = claims == null ? Collections.emptyMap() : Collections.unmodifiableMap(claims);
    }

    public boolean hasRole(String targetRole) {
        String expectedRole = targetRole.startsWith("ROLE_") ? targetRole : "ROLE_" + targetRole;
        return authorities.stream()
            .anyMatch(a -> a.getAuthority().equalsIgnoreCase(expectedRole)
                || a.getAuthority().equalsIgnoreCase(targetRole));
    }
}
