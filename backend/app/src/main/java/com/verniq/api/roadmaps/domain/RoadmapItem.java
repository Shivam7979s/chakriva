package com.verniq.api.roadmaps.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "roadmap_items", schema = "public")
public class RoadmapItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "day_id", nullable = false)
    private UUID dayId;

    @Column(name = "topic_id")
    private UUID topicId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false)
    private LearningItemType itemType = LearningItemType.CONCEPT;

    @Column(nullable = false)
    private Integer position = 0;

    @Column(nullable = false)
    private Boolean required = true;

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes = 20;

    @Column(name = "content_url")
    private String contentUrl;

    @Column(name = "content_markdown", columnDefinition = "TEXT")
    private String contentMarkdown;

    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata = "{}";

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public RoadmapItem() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getDayId() {
        return dayId;
    }

    public void setDayId(UUID dayId) {
        this.dayId = dayId;
    }

    public UUID getTopicId() {
        return topicId;
    }

    public void setTopicId(UUID topicId) {
        this.topicId = topicId;
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

    public LearningItemType getItemType() {
        return itemType;
    }

    public void setItemType(LearningItemType itemType) {
        this.itemType = itemType;
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

    public Integer getEstimatedMinutes() {
        return estimatedMinutes;
    }

    public void setEstimatedMinutes(Integer estimatedMinutes) {
        this.estimatedMinutes = estimatedMinutes;
    }

    public String getContentUrl() {
        return contentUrl;
    }

    public void setContentUrl(String contentUrl) {
        this.contentUrl = contentUrl;
    }

    public String getContentMarkdown() {
        return contentMarkdown;
    }

    public void setContentMarkdown(String contentMarkdown) {
        this.contentMarkdown = contentMarkdown;
    }

    public String getMetadata() {
        return metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
