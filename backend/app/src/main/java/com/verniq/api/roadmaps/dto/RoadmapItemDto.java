package com.verniq.api.roadmaps.dto;

import java.util.UUID;

public class RoadmapItemDto {
    private UUID id;
    private UUID dayId;
    private UUID topicId;
    private String title;
    private String description;
    private String itemType;
    private Integer position;
    private Boolean required;
    private Integer estimatedMinutes;
    private String contentUrl;
    private String contentMarkdown;
    private String status;
    private RoadmapProblemReferenceDto problemReference;

    public RoadmapItemDto() {}

    public RoadmapItemDto(UUID id, UUID dayId, UUID topicId, String title, String description,
                          String itemType, Integer position, Boolean required, Integer estimatedMinutes,
                          String contentUrl, String contentMarkdown, String status,
                          RoadmapProblemReferenceDto problemReference) {
        this.id = id;
        this.dayId = dayId;
        this.topicId = topicId;
        this.title = title;
        this.description = description;
        this.itemType = itemType;
        this.position = position;
        this.required = required;
        this.estimatedMinutes = estimatedMinutes;
        this.contentUrl = contentUrl;
        this.contentMarkdown = contentMarkdown;
        this.status = status;
        this.problemReference = problemReference;
    }

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

    public String getItemType() {
        return itemType;
    }

    public void setItemType(String itemType) {
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public RoadmapProblemReferenceDto getProblemReference() {
        return problemReference;
    }

    public void setProblemReference(RoadmapProblemReferenceDto problemReference) {
        this.problemReference = problemReference;
    }
}
