package com.verniq.api.roadmaps.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "roadmap_days", schema = "public")
public class RoadmapDay {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "sprint_id", nullable = false)
    private UUID sprintId;

    @Column(name = "day_number", nullable = false)
    private Integer dayNumber;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "learning_objectives", columnDefinition = "jsonb")
    private String learningObjectives = "[]";

    @Column(nullable = false)
    private Integer position = 0;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public RoadmapDay() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getSprintId() {
        return sprintId;
    }

    public void setSprintId(UUID sprintId) {
        this.sprintId = sprintId;
    }

    public Integer getDayNumber() {
        return dayNumber;
    }

    public void setDayNumber(Integer dayNumber) {
        this.dayNumber = dayNumber;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLearningObjectives() {
        return learningObjectives;
    }

    public void setLearningObjectives(String learningObjectives) {
        this.learningObjectives = learningObjectives;
    }

    public Integer getPosition() {
        return position;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
