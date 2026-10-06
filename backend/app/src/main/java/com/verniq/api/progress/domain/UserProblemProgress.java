package com.verniq.api.progress.domain;

import com.verniq.api.problems.domain.Problem;
import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Server-authoritative entity representing a user's progress on a problem.
 */
@Entity
@Table(name = "user_problem_progress", uniqueConstraints = {
    @UniqueConstraint(name = "user_problem_progress_user_id_problem_id_key", columnNames = {"user_id", "problem_id"})
})
public class UserProblemProgress implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;

    @Column(name = "status", nullable = false)
    private String status = ProgressStatus.UNATTEMPTED.getDbValue();

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount = 0;

    @Column(name = "first_attempted_at")
    private Instant firstAttemptedAt;

    @Column(name = "last_attempted_at")
    private Instant lastAttemptedAt;

    @Column(name = "first_solved_at")
    private Instant firstSolvedAt;

    @Column(name = "last_solved_at")
    private Instant lastSolvedAt;

    @Column(name = "solved_at")
    private Instant solvedAt;

    @Column(name = "accepted_submission_id")
    private UUID acceptedSubmissionId;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "is_favorite", nullable = false)
    private boolean isFavorite = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public UserProblemProgress() {}

    public UserProblemProgress(UUID userId, Problem problem) {
        this.userId = userId;
        this.problem = problem;
        this.status = ProgressStatus.UNATTEMPTED.getDbValue();
        this.attemptCount = 0;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public ProgressStatus getProgressStatus() {
        return ProgressStatus.fromDb(this.status);
    }

    public void setProgressStatus(ProgressStatus progressStatus) {
        this.status = (progressStatus != null) ? progressStatus.getDbValue() : ProgressStatus.UNATTEMPTED.getDbValue();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public Problem getProblem() {
        return problem;
    }

    public void setProblem(Problem problem) {
        this.problem = problem;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getAttemptCount() {
        return attemptCount;
    }

    public void setAttemptCount(int attemptCount) {
        this.attemptCount = attemptCount;
    }

    public Instant getFirstAttemptedAt() {
        return firstAttemptedAt;
    }

    public void setFirstAttemptedAt(Instant firstAttemptedAt) {
        this.firstAttemptedAt = firstAttemptedAt;
    }

    public Instant getLastAttemptedAt() {
        return lastAttemptedAt;
    }

    public void setLastAttemptedAt(Instant lastAttemptedAt) {
        this.lastAttemptedAt = lastAttemptedAt;
    }

    public Instant getFirstSolvedAt() {
        return firstSolvedAt;
    }

    public void setFirstSolvedAt(Instant firstSolvedAt) {
        this.firstSolvedAt = firstSolvedAt;
        this.solvedAt = firstSolvedAt;
    }

    public Instant getLastSolvedAt() {
        return lastSolvedAt;
    }

    public void setLastSolvedAt(Instant lastSolvedAt) {
        this.lastSolvedAt = lastSolvedAt;
    }

    public Instant getSolvedAt() {
        return solvedAt;
    }

    public void setSolvedAt(Instant solvedAt) {
        this.solvedAt = solvedAt;
    }

    public UUID getAcceptedSubmissionId() {
        return acceptedSubmissionId;
    }

    public void setAcceptedSubmissionId(UUID acceptedSubmissionId) {
        this.acceptedSubmissionId = acceptedSubmissionId;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public boolean isFavorite() {
        return isFavorite;
    }

    public void setFavorite(boolean favorite) {
        isFavorite = favorite;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
