package com.verniq.api.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base API exception carrying an ErrorCode and target HTTP status.
 */
public class ApiException extends RuntimeException {

    private final ErrorCode errorCode;
    private final HttpStatus status;

    public ApiException(ErrorCode errorCode, String message, HttpStatus status) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
    }

    public ApiException(ErrorCode errorCode, String message, HttpStatus status, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.status = status;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
