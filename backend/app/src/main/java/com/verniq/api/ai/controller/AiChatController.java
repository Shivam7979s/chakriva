package com.verniq.api.ai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.verniq.api.common.web.RequestIdHolder;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Map;

/**
 * Authoritative API Gateway Controller for /api/v1/ai.
 *
 * <p>Enforces Supabase JWT authentication via Spring Security and securely
 * forwards client requests to the backend/ai microservice.</p>
 */
@RestController
@RequestMapping("/api/v1/ai")
public class AiChatController {

    private static final Logger log = LoggerFactory.getLogger(AiChatController.class);

    private final String aiServiceUrl;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public AiChatController(
            @Value("${verniq.ai.service-url:http://localhost:8000}") String aiServiceUrl,
            @Value("${verniq.ai.timeout-ms:35000}") int timeoutMs,
            ObjectMapper objectMapper) {
        this.aiServiceUrl = aiServiceUrl.replaceAll("/+$", "");
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(3000));
        factory.setReadTimeout(Duration.ofMillis(timeoutMs));

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(this.aiServiceUrl)
                .build();
    }

    @PostMapping(value = "/chat", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> forwardAiChat(
            @RequestBody String requestBody,
            HttpServletRequest incomingRequest) {

        String authHeader = incomingRequest.getHeader(HttpHeaders.AUTHORIZATION);
        String reqId = RequestIdHolder.get();

        log.info("Forwarding AI chat request to {}/api/v1/ai/chat (reqId={})", aiServiceUrl, reqId);

        try {
            ResponseEntity<String> response = restClient.post()
                    .uri("/api/v1/ai/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.AUTHORIZATION, authHeader != null ? authHeader : "")
                    .header("X-Request-Id", reqId != null ? reqId : "req_unknown")
                    .body(requestBody)
                    .retrieve()
                    .toEntity(String.class);

            return ResponseEntity.status(response.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response.getBody());

        } catch (HttpStatusCodeException ex) {
            log.warn("AI microservice responded with status {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            return ResponseEntity.status(ex.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(ex.getResponseBodyAsString());

        } catch (ResourceAccessException ex) {
            log.error("Unable to connect to AI microservice at {}: {}", aiServiceUrl, ex.getMessage());
            Map<String, Object> errorBody = Map.of(
                    "success", false,
                    "error", "The Riva AI backend microservice (backend/ai) is offline or unreachable at " + aiServiceUrl + ".",
                    "errorCode", "OFFLINE",
                    "statusMessage", "AI backend microservice unreachable."
            );

            try {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(objectMapper.writeValueAsString(errorBody));
            } catch (Exception jsonEx) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"success\":false,\"error\":\"AI service offline\",\"errorCode\":\"OFFLINE\"}");
            }
        } catch (Exception ex) {
            log.error("Unexpected error forwarding AI request: {}", ex.getMessage(), ex);
            Map<String, Object> errorBody = Map.of(
                    "success", false,
                    "error", "An unexpected gateway error occurred while communicating with Riva AI.",
                    "errorCode", "SERVER_ERROR"
            );

            try {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(objectMapper.writeValueAsString(errorBody));
            } catch (Exception jsonEx) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"success\":false,\"error\":\"Internal error\",\"errorCode\":\"SERVER_ERROR\"}");
            }
        }
    }

    @GetMapping(value = "/health", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getAiHealth() {
        try {
            ResponseEntity<String> response = restClient.get()
                    .uri("/api/v1/ai/health")
                    .retrieve()
                    .toEntity(String.class);

            return ResponseEntity.status(response.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response.getBody());
        } catch (Exception ex) {
            Map<String, Object> health = Map.of(
                    "status", "DOWN",
                    "service", "chakriva-ai-gateway",
                    "error", ex.getMessage()
            );
            try {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(objectMapper.writeValueAsString(health));
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("{\"status\":\"DOWN\"}");
            }
        }
    }
}
