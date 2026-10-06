package com.verniq.api.common.web;

/**
 * ThreadLocal storage for the current request correlation ID.
 */
public final class RequestIdHolder {

    private static final ThreadLocal<String> CURRENT_REQUEST_ID = new ThreadLocal<>();

    private RequestIdHolder() {}

    public static void set(String requestId) {
        CURRENT_REQUEST_ID.set(requestId);
    }

    public static String get() {
        return CURRENT_REQUEST_ID.get();
    }

    public static void clear() {
        CURRENT_REQUEST_ID.remove();
    }
}
