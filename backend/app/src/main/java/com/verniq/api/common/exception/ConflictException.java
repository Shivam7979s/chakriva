package com.verniq.api.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception indicating a state conflict or duplicate conflicting request (HTTP 409).
 */
public class ConflictException extends ApiException {

    public ConflictException(String message) {
        super(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT);
    }

    public ConflictException(String message, Throwable cause) {
        super(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT, cause);
    }
}
