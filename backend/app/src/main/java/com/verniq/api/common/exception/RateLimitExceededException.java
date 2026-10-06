package com.verniq.api.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an endpoint's rate limit or submission frequency limit is exceeded.
 */
public class RateLimitExceededException extends ApiException {

    private final long retryAfterSeconds;

    public RateLimitExceededException(String message, long retryAfterSeconds) {
        super(ErrorCode.RATE_LIMIT_EXCEEDED, message, HttpStatus.TOO_MANY_REQUESTS);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public RateLimitExceededException(String message) {
        this(message, 5L);
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
