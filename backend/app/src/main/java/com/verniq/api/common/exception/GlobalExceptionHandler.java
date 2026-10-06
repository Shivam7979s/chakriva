package com.verniq.api.common.exception;

import com.verniq.api.common.response.ErrorResponse;
import com.verniq.api.common.web.RequestIdFilter;
import com.verniq.api.common.web.RequestIdHolder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Centralized exception translation handler.
 *
 * <p>Ensures that all client-facing error payloads strictly follow the
 * Verniq ErrorResponse contract without leaking internal implementation details
 * or stack traces.</p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.warn("API exception [{}]: {} on path {} (reqId: {})",
            ex.getErrorCode(), ex.getMessage(), request.getRequestURI(), requestId);

        ErrorResponse response = ErrorResponse.of(
            ex.getErrorCode().name(),
            ex.getMessage(),
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(ex.getStatus()).body(response);
    }

    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRateLimitExceeded(RateLimitExceededException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.warn("Rate limit exceeded on {} (reqId: {}): {}", request.getRequestURI(), requestId, ex.getMessage());

        ErrorResponse response = ErrorResponse.of(
            ex.getErrorCode().name(),
            ex.getMessage(),
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header(org.springframework.http.HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
            .body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        List<ErrorResponse.ValidationErrorDetail> details = new ArrayList<>();

        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            details.add(new ErrorResponse.ValidationErrorDetail(
                fieldError.getField(),
                fieldError.getDefaultMessage() != null ? fieldError.getDefaultMessage() : "Invalid value"
            ));
        }

        log.warn("Validation failed for request on {}: {} violation(s) (reqId: {})",
            request.getRequestURI(), details.size(), requestId);

        ErrorResponse response = ErrorResponse.of(
            ErrorCode.VALIDATION_ERROR.name(),
            "Request validation failed",
            details,
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        List<ErrorResponse.ValidationErrorDetail> details = new ArrayList<>();

        ex.getConstraintViolations().forEach(violation -> details.add(
            new ErrorResponse.ValidationErrorDetail(
                violation.getPropertyPath().toString(),
                violation.getMessage()
            )
        ));

        ErrorResponse response = ErrorResponse.of(
            ErrorCode.VALIDATION_ERROR.name(),
            "Constraint validation failed",
            details,
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMalformedRequest(HttpMessageNotReadableException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.warn("Malformed HTTP request body on {}: {} (reqId: {})", request.getRequestURI(), ex.getMessage(), requestId);

        ErrorResponse response = ErrorResponse.of(
            ErrorCode.BAD_REQUEST.name(),
            "Malformed or unreadable HTTP request body",
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler({ResourceNotFoundException.class, NoResourceFoundException.class, NoSuchElementException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(Exception ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.info("Resource not found on {}: {} (reqId: {})", request.getRequestURI(), ex.getMessage(), requestId);

        ErrorResponse response = ErrorResponse.of(
            ErrorCode.RESOURCE_NOT_FOUND.name(),
            ex.getMessage() != null ? ex.getMessage() : "Requested resource was not found",
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<ErrorResponse> handleIllegalArgument(Exception ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.warn("Illegal argument on {}: {} (reqId: {})", request.getRequestURI(), ex.getMessage(), requestId);

        ErrorResponse response = ErrorResponse.of(
            ErrorCode.BAD_REQUEST.name(),
            ex.getMessage() != null ? ex.getMessage() : "Invalid request parameters",
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        ErrorResponse response = ErrorResponse.of(
            ErrorCode.BAD_REQUEST.name(),
            "HTTP method %s not supported for this endpoint".formatted(ex.getMethod()),
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(response);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        ErrorResponse response = ErrorResponse.of(
            ErrorCode.BAD_REQUEST.name(),
            "Content-Type not supported: " + ex.getContentType(),
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(response);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.warn("Authentication failed on {}: {} (reqId: {})", request.getRequestURI(), ex.getMessage(), requestId);

        ErrorResponse response = ErrorResponse.of(
            ErrorCode.UNAUTHORIZED.name(),
            "Authentication required or credentials invalid",
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.warn("Access denied on {}: {} (reqId: {})", request.getRequestURI(), ex.getMessage(), requestId);

        ErrorResponse response = ErrorResponse.of(
            ErrorCode.FORBIDDEN.name(),
            "Access denied: Insufficient permissions to access this resource",
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.error("Unhandled internal server error on {} (reqId: {})", request.getRequestURI(), requestId, ex);

        ErrorResponse response = ErrorResponse.of(
            ErrorCode.INTERNAL_SERVER_ERROR.name(),
            "An unexpected internal error occurred. Please contact support referencing request ID.",
            request.getRequestURI(),
            requestId
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    private String resolveRequestId(HttpServletRequest request) {
        String reqId = RequestIdHolder.get();
        if (reqId != null && !reqId.isBlank()) {
            return reqId;
        }
        String header = request.getHeader(RequestIdFilter.REQUEST_ID_HEADER);
        return (header != null && !header.isBlank()) ? header : "req_unknown";
    }
}
