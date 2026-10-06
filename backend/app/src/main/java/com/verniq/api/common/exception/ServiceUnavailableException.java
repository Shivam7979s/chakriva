package com.verniq.api.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an internal dependency (e.g. Redis submission queue) is temporarily unavailable.
 */
public class ServiceUnavailableException extends ApiException {

    public ServiceUnavailableException(String message) {
        super(ErrorCode.SERVICE_UNAVAILABLE, message, HttpStatus.SERVICE_UNAVAILABLE);
    }

    public ServiceUnavailableException(String message, Throwable cause) {
        super(ErrorCode.SERVICE_UNAVAILABLE, message, HttpStatus.SERVICE_UNAVAILABLE, cause);
    }
}
