package com.verniq.api.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.util.StringUtils;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Configures the Spring Security OAuth2 JwtDecoder for Supabase authentication.
 *
 * <p>Supports asymmetric JWKS verification (preferred in cloud Supabase) and
 * symmetric HMAC-SHA256 secret verification (standard in local development).</p>
 */
@Configuration
public class JwtConfig {

    private static final Logger log = LoggerFactory.getLogger(JwtConfig.class);

    private final ApplicationProperties applicationProperties;

    public JwtConfig(ApplicationProperties applicationProperties) {
        this.applicationProperties = applicationProperties;
    }

    @Bean
    @ConditionalOnMissingBean(JwtDecoder.class)
    public JwtDecoder jwtDecoder() {
        ApplicationProperties.SupabaseProperties supabase = applicationProperties.supabase();
        NimbusJwtDecoder decoder;

        if (supabase != null && StringUtils.hasText(supabase.jwtJwkSetUri())) {
            log.info("Configuring Supabase JwtDecoder using JWKS URI: {}", supabase.jwtJwkSetUri());
            decoder = NimbusJwtDecoder.withJwkSetUri(supabase.jwtJwkSetUri())
                .jwsAlgorithms(algs -> {
                    algs.add(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.RS256);
                    algs.add(org.springframework.security.oauth2.jose.jws.SignatureAlgorithm.ES256);
                })
                .build();
        } else {
            String secret = (supabase != null && StringUtils.hasText(supabase.jwtSecret()))
                ? supabase.jwtSecret()
                // Default local dev fallback secret (must be >= 32 bytes for HS256)
                : "verniq-local-default-jwt-secret-key-32bytes-min";

            log.info("Configuring Supabase JwtDecoder using HMAC-SHA256 signature verification");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            decoder = NimbusJwtDecoder.withSecretKey(secretKey).macAlgorithm(MacAlgorithm.HS256).build();
        }

        // Configure validators (Timestamp + optional audience / issuer)
        List<OAuth2TokenValidator<Jwt>> validators = new ArrayList<>();
        validators.add(new JwtTimestampValidator());

        if (supabase != null && StringUtils.hasText(supabase.jwtAudience())) {
            validators.add(new AudienceValidator(supabase.jwtAudience()));
        }
        if (supabase != null && StringUtils.hasText(supabase.jwtIssuer())) {
            validators.add(new JwtIssuerValidator(supabase.jwtIssuer()));
        }

        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(validators));
        return decoder;
    }

    private static class AudienceValidator implements OAuth2TokenValidator<Jwt> {
        private final String expectedAudience;

        AudienceValidator(String expectedAudience) {
            this.expectedAudience = expectedAudience;
        }

        @Override
        public OAuth2TokenValidatorResult validate(Jwt jwt) {
            List<String> audience = jwt.getAudience();
            if (audience != null && audience.contains(expectedAudience)) {
                return OAuth2TokenValidatorResult.success();
            }
            // In Supabase, 'aud' can sometimes be formatted as a single claim or string
            Object audClaim = jwt.getClaims().get("aud");
            if (audClaim instanceof String audStr && expectedAudience.equals(audStr)) {
                return OAuth2TokenValidatorResult.success();
            }

            OAuth2Error error = new OAuth2Error("invalid_token", "The required audience is missing or invalid", null);
            return OAuth2TokenValidatorResult.failure(error);
        }
    }
}
