package com.verniq.api.common.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.verniq.api.auth.SupabaseJwtAuthenticationConverter;
import com.verniq.api.common.exception.ErrorCode;
import com.verniq.api.common.response.ErrorResponse;
import com.verniq.api.common.web.RequestIdFilter;
import com.verniq.api.common.web.RequestIdHolder;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Spring Security configuration acting as the authoritative backend security boundary.
 *
 * <p>Enforces stateless OAuth2 resource server behavior, Supabase JWT validation,
 * CORS policies, and standardized JSON error contracts.</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final ApplicationProperties applicationProperties;
    private final RequestIdFilter requestIdFilter;
    private final ObjectMapper objectMapper;

    public SecurityConfig(ApplicationProperties applicationProperties,
                          RequestIdFilter requestIdFilter,
                          ObjectMapper objectMapper) {
        this.applicationProperties = applicationProperties;
        this.requestIdFilter = requestIdFilter;
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .headers(headers -> headers
                .contentTypeOptions(contentType -> {})
                .frameOptions(frame -> frame.deny())
                .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Allow CORS preflight requests
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Public Health & Probe endpoints
                .requestMatchers("/api/v1/health/**").permitAll()
                .requestMatchers("/api/v1/live", "/api/v1/ready").permitAll()
                .requestMatchers("/actuator/health/**", "/actuator/info", "/actuator/metrics/**").permitAll()
                .requestMatchers("/error").permitAll()
                // Public Problem Catalog (Read-Only)
                .requestMatchers(HttpMethod.GET, "/api/v1/problems/**").permitAll()
                // Internal Judge Callbacks (Protected by X-Internal-Secret)
                .requestMatchers("/api/v1/internal/judge/**").permitAll()
                // All other business endpoints require authentication
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(new SupabaseJwtAuthenticationConverter()))
                .authenticationEntryPoint(authenticationEntryPoint())
                .accessDeniedHandler(accessDeniedHandler())
            )
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(authenticationEntryPoint())
                .accessDeniedHandler(accessDeniedHandler())
            )
            .addFilterBefore(requestIdFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        ApplicationProperties.CorsProperties corsProps = applicationProperties.cors();

        config.setAllowedOrigins(corsProps.allowedOrigins());
        config.setAllowedMethods(corsProps.allowedMethods());
        config.setAllowedHeaders(corsProps.allowedHeaders());
        config.setMaxAge(corsProps.maxAgeSeconds());
        config.setExposedHeaders(List.of(RequestIdFilter.REQUEST_ID_HEADER, HttpHeaders.AUTHORIZATION));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            String requestId = resolveRequestId(request);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader(RequestIdFilter.REQUEST_ID_HEADER, requestId);

            ErrorResponse error = ErrorResponse.of(
                ErrorCode.UNAUTHORIZED.name(),
                "Full authentication is required to access this resource",
                request.getRequestURI(),
                requestId
            );
            response.getWriter().write(objectMapper.writeValueAsString(error));
        };
    }

    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            String requestId = resolveRequestId(request);
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader(RequestIdFilter.REQUEST_ID_HEADER, requestId);

            ErrorResponse error = ErrorResponse.of(
                ErrorCode.FORBIDDEN.name(),
                "Access denied: Insufficient permissions for this resource",
                request.getRequestURI(),
                requestId
            );
            response.getWriter().write(objectMapper.writeValueAsString(error));
        };
    }

    private String resolveRequestId(jakarta.servlet.http.HttpServletRequest request) {
        String reqId = RequestIdHolder.get();
        if (reqId != null && !reqId.isBlank()) {
            return reqId;
        }
        String header = request.getHeader(RequestIdFilter.REQUEST_ID_HEADER);
        return (header != null && !header.isBlank()) ? header : "req_unknown";
    }
}
