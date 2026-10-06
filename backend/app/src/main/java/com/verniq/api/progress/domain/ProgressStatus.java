package com.verniq.api.progress.domain;

import java.util.Locale;

/**
 * Server-authoritative problem progress status.
 */
public enum ProgressStatus {
    UNATTEMPTED("unattempted"),
    ATTEMPTED("attempted"),
    SOLVED("solved");

    private final String dbValue;

    ProgressStatus(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    public static ProgressStatus fromDb(String value) {
        if (value == null || value.isBlank()) {
            return UNATTEMPTED;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "solved" -> SOLVED;
            case "attempted" -> ATTEMPTED;
            case "unattempted", "todo" -> UNATTEMPTED;
            default -> {
                try {
                    yield ProgressStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
                } catch (IllegalArgumentException e) {
                    yield UNATTEMPTED;
                }
            }
        };
    }
}
