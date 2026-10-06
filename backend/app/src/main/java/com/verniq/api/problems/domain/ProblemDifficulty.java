package com.verniq.api.problems.domain;

/**
 * Standard difficulty level for Verniq algorithmic problems.
 */
public enum ProblemDifficulty {
    EASY,
    MEDIUM,
    HARD;

    public static ProblemDifficulty fromString(String val) {
        if (val == null || val.isBlank()) {
            return null;
        }
        for (ProblemDifficulty d : values()) {
            if (d.name().equalsIgnoreCase(val.trim())) {
                return d;
            }
        }
        return null;
    }
}
