package com.verniq.api.roadmaps.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "roadmap_problem_references", schema = "public")
public class RoadmapProblemReference {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "roadmap_item_id", nullable = false)
    private UUID roadmapItemId;

    @Column(name = "verniq_problem_id", nullable = false)
    private String verniqProblemId;

    @Column(nullable = false)
    private Integer position = 0;

    @Column(nullable = false)
    private Boolean required = true;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public RoadmapProblemReference() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getRoadmapItemId() {
        return roadmapItemId;
    }

    public void setRoadmapItemId(UUID roadmapItemId) {
        this.roadmapItemId = roadmapItemId;
    }

    public String getVerniqProblemId() {
        return verniqProblemId;
    }

    public void setVerniqProblemId(String verniqProblemId) {
        this.verniqProblemId = verniqProblemId;
    }

    public Integer getPosition() {
        return position;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }

    public Boolean getRequired() {
        return required;
    }

    public void setRequired(Boolean required) {
        this.required = required;
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
}
