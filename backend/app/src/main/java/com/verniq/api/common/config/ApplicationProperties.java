package com.verniq.api.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.util.List;

/**
 * Strongly-typed application properties for Verniq API.
 */
@ConfigurationProperties(prefix = "app")
public record ApplicationProperties(
    String name,
    String version,
    String environment,
    CorsProperties cors,
    SupabaseProperties supabase
) {
    public ApplicationProperties {
        if (name == null || name.isBlank()) {
            name = "verniq-api";
        }
        if (version == null || version.isBlank()) {
            version = "1.0.0";
        }
        if (environment == null || environment.isBlank()) {
            environment = "development";
        }
        if (cors == null) {
            cors = new CorsProperties(
                List.of("http://localhost:5173", "http://127.0.0.1:5173"),
                List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"),
                List.of("*"),
                3600L
            );
        }
        if (supabase == null) {
            supabase = new SupabaseProperties("http://127.0.0.1:54321", null, null, null, "authenticated");
        }
    }

    public record CorsProperties(
        List<String> allowedOrigins,
        List<String> allowedMethods,
        List<String> allowedHeaders,
        Long maxAgeSeconds
    ) {}

    public record SupabaseProperties(
        String url,
        String jwtSecret,
        String jwtIssuer,
        String jwtJwkSetUri,
        String jwtAudience
    ) {
        public SupabaseProperties {
            if (jwtAudience == null || jwtAudience.isBlank()) {
                jwtAudience = "authenticated";
            }
        }
    }
}
