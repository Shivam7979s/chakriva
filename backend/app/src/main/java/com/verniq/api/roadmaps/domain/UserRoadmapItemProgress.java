package com.verniq.api.roadmaps.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_roadmap_item_progress", schema = "public",
       uniqueConstraints = @UniqueConstraint(name = "uq_user_roadmap_item", columnNames = {"user_id", "roadmap_item_id"}))
public class UserRoadmapItemProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "roadmap_item_id", nullable = false)
    private UUID roadmapItemId;

    @Column(nullable = false)
    private String status = "AVAILABLE";

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    public UserRoadmapItemProgress() {}

    public UserRoadmapItemProgress(UUID userId, UUID roadmapItemId, String status) {
        this.userId = userId;
        this.roadmapItemId = roadmapItemId;
        this.status = status;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if ("COMPLETED".equalsIgnoreCase(status)) {
            this.completedAt = Instant.now();
        }
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

    public UUID getRoadmapItemId() {
        return roadmapItemId;
    }

    public void setRoadmapItemId(UUID roadmapItemId) {
        this.roadmapItemId = roadmapItemId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
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
