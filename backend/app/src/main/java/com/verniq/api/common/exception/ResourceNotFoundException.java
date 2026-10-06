package com.verniq.api.common.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends ApiException {

    public ResourceNotFoundException(String message) {
        super(ErrorCode.RESOURCE_NOT_FOUND, message, HttpStatus.NOT_FOUND);
    }

    public ResourceNotFoundException(String resourceName, String identifier) {
        super(ErrorCode.RESOURCE_NOT_FOUND, "%s not found for identifier: %s".formatted(resourceName, identifier), HttpStatus.NOT_FOUND);
    }
}
