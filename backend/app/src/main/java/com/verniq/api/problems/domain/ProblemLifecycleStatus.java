package com.verniq.api.problems.domain;

import java.util.Locale;

/**
 * Controlled lifecycle stages for Verniq problems according to Section 10 of Architecture Specification.
 */
public enum ProblemLifecycleStatus {
    DRAFT,
    CONTENT_REVIEW,
    TECHNICAL_REVIEW,
    APPROVED,
    PUBLISHED,
    ARCHIVED;

    public static ProblemLifecycleStatus fromDatabaseValue(String val) {
        if (val == null || val.isBlank()) {
            return DRAFT;
        }
        String normalized = val.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "published" -> PUBLISHED;
            case "archived" -> ARCHIVED;
            case "approved", "ready", "judge_ready" -> APPROVED;
            case "content_review", "content_authoring" -> CONTENT_REVIEW;
            case "technical_review", "provenance_review" -> TECHNICAL_REVIEW;
            default -> DRAFT;
        };
    }

    public String toDatabaseValue() {
        return name().toLowerCase(Locale.ROOT);
    }
}
