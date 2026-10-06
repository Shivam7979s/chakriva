package com.verniq.api.submissions;

import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.domain.SubmissionLanguage;
import com.verniq.api.submissions.domain.SubmissionStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SubmissionStateTest {

    @Test
    @DisplayName("State machine: Valid forward transitions are permitted")
    void testValidStateTransitions() {
        Submission sub = new Submission();
        sub.setStatus(SubmissionStatus.QUEUED);

        assertThat(sub.getStatus().canTransitionTo(SubmissionStatus.PROCESSING)).isTrue();
        assertThat(sub.getStatus().canTransitionTo(SubmissionStatus.ACCEPTED)).isTrue();

        sub.markProcessing();
        assertThat(sub.getStatus()).isEqualTo(SubmissionStatus.PROCESSING);
        assertThat(sub.getStartedAt()).isNotNull();

        assertThat(sub.getStatus().canTransitionTo(SubmissionStatus.ACCEPTED)).isTrue();
        assertThat(sub.getStatus().canTransitionTo(SubmissionStatus.WRONG_ANSWER)).isTrue();
        assertThat(sub.getStatus().canTransitionTo(SubmissionStatus.TIME_LIMIT_EXCEEDED)).isTrue();

        sub.markComplete(SubmissionStatus.ACCEPTED, 150, 2048, 10, 10, null, null, null, null);
        assertThat(sub.getStatus()).isEqualTo(SubmissionStatus.ACCEPTED);
        assertThat(sub.getCompletedAt()).isNotNull();
        assertThat(sub.getScore()).isEqualTo(100.0);
    }

    @Test
    @DisplayName("State machine: Invalid backwards or terminal transitions are rejected")
    void testInvalidStateTransitions() {
        Submission sub = new Submission();
        sub.setStatus(SubmissionStatus.QUEUED);
        sub.markComplete(SubmissionStatus.ACCEPTED, 100, 1024, 5, 5, null, null, null, null);

        // Terminal state cannot transition anywhere
        assertThat(sub.getStatus().canTransitionTo(SubmissionStatus.PROCESSING)).isFalse();
        assertThat(sub.getStatus().canTransitionTo(SubmissionStatus.QUEUED)).isFalse();

        assertThatThrownBy(() -> sub.markProcessing())
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Cannot transition");
    }

    @Test
    @DisplayName("Language parser: Normalizes aliases and rejects unsupported languages")
    void testLanguageParser() {
        assertThat(SubmissionLanguage.from("java")).isEqualTo(SubmissionLanguage.JAVA);
        assertThat(SubmissionLanguage.from("JAVA")).isEqualTo(SubmissionLanguage.JAVA);
        assertThat(SubmissionLanguage.from("python")).isEqualTo(SubmissionLanguage.PYTHON);
        assertThat(SubmissionLanguage.from("py")).isEqualTo(SubmissionLanguage.PYTHON);
        assertThat(SubmissionLanguage.from("cpp")).isEqualTo(SubmissionLanguage.CPP);
        assertThat(SubmissionLanguage.from("c++")).isEqualTo(SubmissionLanguage.CPP);
        assertThat(SubmissionLanguage.from("typescript")).isEqualTo(SubmissionLanguage.TYPESCRIPT);
        assertThat(SubmissionLanguage.from("ts")).isEqualTo(SubmissionLanguage.TYPESCRIPT);
        assertThat(SubmissionLanguage.from("go")).isEqualTo(SubmissionLanguage.GO);

        assertThatThrownBy(() -> SubmissionLanguage.from("ruby"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Unsupported programming language");
    }
}
