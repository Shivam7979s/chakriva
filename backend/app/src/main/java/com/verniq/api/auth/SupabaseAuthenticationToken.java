package com.verniq.api.auth;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Collection;

/**
 * Authentication token wrapping a validated Supabase JWT and its resolved AuthenticatedUser principal.
 */
public class SupabaseAuthenticationToken extends AbstractAuthenticationToken {

    private final AuthenticatedUser principal;
    private final Jwt credentials;

    public SupabaseAuthenticationToken(Jwt jwt, AuthenticatedUser principal, Collection<? extends GrantedAuthority> authorities) {
        super(authorities);
        this.credentials = jwt;
        this.principal = principal;
        setAuthenticated(true);
    }

    @Override
    public Jwt getCredentials() {
        return credentials;
    }

    @Override
    public AuthenticatedUser getPrincipal() {
        return principal;
    }

    @Override
    public String getName() {
        return principal.id().toString();
    }
}
