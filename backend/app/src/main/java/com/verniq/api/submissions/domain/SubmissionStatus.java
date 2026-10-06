package com.verniq.api.submissions.domain;

import java.util.Locale;
import java.util.Set;

/**
 * Authoritative submission lifecycle states and state machine transitions.
 */
public enum SubmissionStatus {
    QUEUED,
    PROCESSING,
    ACCEPTED,
    WRONG_ANSWER,
    TIME_LIMIT_EXCEEDED,
    MEMORY_LIMIT_EXCEEDED,
    COMPILATION_ERROR,
    RUNTIME_ERROR,
    INTERNAL_ERROR,
    CANCELLED;

    private static final Set<SubmissionStatus> TERMINAL_STATES = Set.of(
        ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, MEMORY_LIMIT_EXCEEDED,
        COMPILATION_ERROR, RUNTIME_ERROR, INTERNAL_ERROR, CANCELLED
    );

    public boolean isTerminal() {
        return TERMINAL_STATES.contains(this);
    }

    /**
     * Validates whether a state transition from `this` to `target` is valid.
     */
    public boolean canTransitionTo(SubmissionStatus target) {
        if (target == null) {
            return false;
        }
        if (this == target) {
            return true; // Idempotent same-state update
        }
        return switch (this) {
            case QUEUED -> target == PROCESSING || target.isTerminal();
            case PROCESSING -> target.isTerminal();
            default -> false; // Terminal states cannot transition to other states
        };
    }

    /**
     * Converts a database enum/string (e.g. 'pending', 'running', 'accepted') to SubmissionStatus.
     */
    public static SubmissionStatus fromDbVerdict(String dbVerdict) {
        if (dbVerdict == null || dbVerdict.isBlank()) {
            return QUEUED;
        }
        String normalized = dbVerdict.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "pending", "queued" -> QUEUED;
            case "running", "processing" -> PROCESSING;
            case "accepted" -> ACCEPTED;
            case "wrong_answer" -> WRONG_ANSWER;
            case "time_limit_exceeded" -> TIME_LIMIT_EXCEEDED;
            case "memory_limit_exceeded" -> MEMORY_LIMIT_EXCEEDED;
            case "compilation_error" -> COMPILATION_ERROR;
            case "runtime_error" -> RUNTIME_ERROR;
            case "cancelled" -> CANCELLED;
            case "internal_error", "system_error" -> INTERNAL_ERROR;
            default -> {
                try {
                    yield SubmissionStatus.valueOf(dbVerdict.trim().toUpperCase(Locale.ROOT));
                } catch (IllegalArgumentException e) {
                    yield INTERNAL_ERROR;
                }
            }
        };
    }

    /**
     * Converts to database lowercase enum representation.
     */
    public String toDbVerdict() {
        return switch (this) {
            case QUEUED -> "pending";
            case PROCESSING -> "running";
            case ACCEPTED -> "accepted";
            case WRONG_ANSWER -> "wrong_answer";
            case TIME_LIMIT_EXCEEDED -> "time_limit_exceeded";
            case MEMORY_LIMIT_EXCEEDED -> "memory_limit_exceeded";
            case COMPILATION_ERROR -> "compilation_error";
            case RUNTIME_ERROR -> "runtime_error";
            case CANCELLED -> "cancelled";
            case INTERNAL_ERROR -> "internal_error";
        };
    }
}
