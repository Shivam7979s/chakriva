package com.verniq.api.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.*;

/**
 * Converts a cryptographically validated Supabase JWT into a Verniq SupabaseAuthenticationToken.
 *
 * <p>Enforces that user identity is derived strictly from the trusted JWT subject (`sub`),
 * and extracts server-signed role claims from `app_metadata` without trusting arbitrary
 * client-supplied headers or JSON parameters.</p>
 */
public class SupabaseJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private static final Logger log = LoggerFactory.getLogger(SupabaseJwtAuthenticationConverter.class);

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String sub = jwt.getSubject();
        UUID userId;
        try {
            userId = UUID.fromString(sub);
        } catch (IllegalArgumentException e) {
            log.warn("Non-UUID subject in Supabase JWT: {}", sub);
            userId = UUID.nameUUIDFromBytes(sub.getBytes());
        }

        String email = jwt.getClaimAsString("email");

        // Derive roles from trusted server-signed claims (e.g. app_metadata or top-level role)
        Set<GrantedAuthority> authorities = new HashSet<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));

        String primaryRole = "USER";

        // Check app_metadata (server-controlled claim in Supabase)
        Map<String, Object> appMetadata = jwt.getClaimAsMap("app_metadata");
        if (appMetadata != null) {
            Object roleObj = appMetadata.get("role");
            if (roleObj instanceof String roleStr && !roleStr.isBlank()) {
                primaryRole = roleStr.toUpperCase(Locale.ROOT);
                authorities.add(new SimpleGrantedAuthority("ROLE_" + primaryRole));
            }

            Object rolesObj = appMetadata.get("roles");
            if (rolesObj instanceof Collection<?> rolesColl) {
                for (Object r : rolesColl) {
                    if (r instanceof String rStr && !rStr.isBlank()) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + rStr.toUpperCase(Locale.ROOT)));
                    }
                }
            }
        }

        // Service-role token handling (used internally or by background admin workers)
        String topLevelRole = jwt.getClaimAsString("role");
        if ("service_role".equalsIgnoreCase(topLevelRole)) {
            primaryRole = "ADMIN";
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }

        AuthenticatedUser user = new AuthenticatedUser(
            userId,
            email != null ? email : "",
            primaryRole,
            authorities,
            jwt.getClaims()
        );

        return new SupabaseAuthenticationToken(jwt, user, authorities);
    }
}
