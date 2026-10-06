package com.verniq.api.common.exception;

import org.springframework.http.HttpStatus;

public class InvalidRequestException extends ApiException {

    public InvalidRequestException(String message) {
        super(ErrorCode.BAD_REQUEST, message, HttpStatus.BAD_REQUEST);
    }
}
