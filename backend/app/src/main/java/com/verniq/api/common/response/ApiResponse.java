package com.verniq.api.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

/**
 * Standard successful response container.
 *
 * @param <T> data payload type
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
    boolean success,
    T data,
    Instant timestamp
) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, Instant.now());
    }

    public static <T> ApiResponse<T> created(T data) {
        return new ApiResponse<>(true, data, Instant.now());
    }
}
