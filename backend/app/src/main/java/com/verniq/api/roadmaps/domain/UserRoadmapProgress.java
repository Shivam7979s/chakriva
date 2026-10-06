package com.verniq.api.roadmaps.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_roadmap_progress", schema = "public",
       uniqueConstraints = @UniqueConstraint(name = "uq_user_roadmap", columnNames = {"user_id", "roadmap_id"}))
public class UserRoadmapProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "roadmap_id", nullable = false)
    private UUID roadmapId;

    @Column(name = "current_sprint_id")
    private UUID currentSprintId;

    @Column(name = "current_day_id")
    private UUID currentDayId;

    @Column(name = "current_item_id")
    private UUID currentItemId;

    @Column(nullable = false)
    private String status = "in_progress";

    @Column(name = "completed_items_count", nullable = false)
    private Integer completedItemsCount = 0;

    @Column(name = "total_items_count", nullable = false)
    private Integer totalItemsCount = 0;

    @Column(name = "last_accessed_at")
    private Instant lastAccessedAt = Instant.now();

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    public UserRoadmapProgress() {}

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

    public UUID getRoadmapId() {
        return roadmapId;
    }

    public void setRoadmapId(UUID roadmapId) {
        this.roadmapId = roadmapId;
    }

    public UUID getCurrentSprintId() {
        return currentSprintId;
    }

    public void setCurrentSprintId(UUID currentSprintId) {
        this.currentSprintId = currentSprintId;
    }

    public UUID getCurrentDayId() {
        return currentDayId;
    }

    public void setCurrentDayId(UUID currentDayId) {
        this.currentDayId = currentDayId;
    }

    public UUID getCurrentItemId() {
        return currentItemId;
    }

    public void setCurrentItemId(UUID currentItemId) {
        this.currentItemId = currentItemId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getCompletedItemsCount() {
        return completedItemsCount;
    }

    public void setCompletedItemsCount(Integer completedItemsCount) {
        this.completedItemsCount = completedItemsCount;
    }

    public Integer getTotalItemsCount() {
        return totalItemsCount;
    }

    public void setTotalItemsCount(Integer totalItemsCount) {
        this.totalItemsCount = totalItemsCount;
    }

    public Instant getLastAccessedAt() {
        return lastAccessedAt;
    }

    public void setLastAccessedAt(Instant lastAccessedAt) {
        this.lastAccessedAt = lastAccessedAt;
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
