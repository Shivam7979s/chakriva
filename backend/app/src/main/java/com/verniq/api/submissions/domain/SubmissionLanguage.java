package com.verniq.api.submissions.domain;

import java.util.Locale;

/**
 * Normalized programming languages supported by the Verniq online judge.
 */
public enum SubmissionLanguage {
    JAVA("java"),
    PYTHON("python"),
    CPP("cpp"),
    TYPESCRIPT("typescript"),
    GO("go");

    private final String dbValue;

    SubmissionLanguage(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    public static SubmissionLanguage from(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Language cannot be null or blank");
        }
        String normalized = raw.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "java" -> JAVA;
            case "python", "py", "python3" -> PYTHON;
            case "cpp", "c++", "cplusplus" -> CPP;
            case "typescript", "ts" -> TYPESCRIPT;
            case "go", "golang" -> GO;
            default -> throw new IllegalArgumentException("Unsupported programming language: " + raw);
        };
    }
}
