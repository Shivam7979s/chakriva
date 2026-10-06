package com.verniq.api.roadmaps.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "roadmap_sprints", schema = "public")
public class RoadmapSprint {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "roadmap_id", nullable = false)
    private UUID roadmapId;

    @Column(name = "phase_id")
    private UUID phaseId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Integer position = 0;

    @Column(name = "estimated_hours")
    private Double estimatedHours = 10.0;

    @Column(name = "is_published", nullable = false)
    private Boolean isPublished = true;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public RoadmapSprint() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getRoadmapId() {
        return roadmapId;
    }

    public void setRoadmapId(UUID roadmapId) {
        this.roadmapId = roadmapId;
    }

    public UUID getPhaseId() {
        return phaseId;
    }

    public void setPhaseId(UUID phaseId) {
        this.phaseId = phaseId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getPosition() {
        return position;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }

    public Double getEstimatedHours() {
        return estimatedHours;
    }

    public void setEstimatedHours(Double estimatedHours) {
        this.estimatedHours = estimatedHours;
    }

    public Boolean getIsPublished() {
        return isPublished;
    }

    public void setIsPublished(Boolean isPublished) {
        this.isPublished = isPublished;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
