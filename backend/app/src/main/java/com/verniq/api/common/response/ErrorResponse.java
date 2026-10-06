package com.verniq.api.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

/**
 * Standard error response container for all Verniq API endpoints.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
    boolean success,
    ErrorInfo error,
    Instant timestamp,
    String path,
    String requestId
) {
    public record ErrorInfo(
        String code,
        String message,
        List<ValidationErrorDetail> details
    ) {
        public ErrorInfo(String code, String message) {
            this(code, message, null);
        }
    }

    public record ValidationErrorDetail(
        String field,
        String message
    ) {}

    public static ErrorResponse of(String code, String message, String path, String requestId) {
        return new ErrorResponse(
            false,
            new ErrorInfo(code, message),
            Instant.now(),
            path,
            requestId
        );
    }

    public static ErrorResponse of(String code, String message, List<ValidationErrorDetail> details, String path, String requestId) {
        return new ErrorResponse(
            false,
            new ErrorInfo(code, message, details),
            Instant.now(),
            path,
            requestId
        );
    }
}
