package com.verniq.api.common.exception;

import org.springframework.http.HttpStatus;

public class UnauthorizedException extends ApiException {

    public UnauthorizedException(String message) {
        super(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED);
    }
}
