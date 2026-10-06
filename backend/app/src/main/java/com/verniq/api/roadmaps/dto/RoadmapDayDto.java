package com.verniq.api.roadmaps.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class RoadmapDayDto {
    private UUID id;
    private UUID sprintId;
    private Integer dayNumber;
    private String title;
    private String description;
    private List<String> learningObjectives = new ArrayList<>();
    private Integer position;
    private String status;
    private List<RoadmapTopicDto> topics = new ArrayList<>();
    private List<RoadmapItemDto> items = new ArrayList<>();

    public RoadmapDayDto() {}

    public RoadmapDayDto(UUID id, UUID sprintId, Integer dayNumber, String title, String description,
                         List<String> learningObjectives, Integer position, String status,
                         List<RoadmapTopicDto> topics, List<RoadmapItemDto> items) {
        this.id = id;
        this.sprintId = sprintId;
        this.dayNumber = dayNumber;
        this.title = title;
        this.description = description;
        this.learningObjectives = learningObjectives != null ? learningObjectives : new ArrayList<>();
        this.position = position;
        this.status = status;
        this.topics = topics != null ? topics : new ArrayList<>();
        this.items = items != null ? items : new ArrayList<>();
    }

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

    public List<String> getLearningObjectives() {
        return learningObjectives;
    }

    public void setLearningObjectives(List<String> learningObjectives) {
        this.learningObjectives = learningObjectives;
    }

    public Integer getPosition() {
        return position;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<RoadmapTopicDto> getTopics() {
        return topics;
    }

    public void setTopics(List<RoadmapTopicDto> topics) {
        this.topics = topics;
    }

    public List<RoadmapItemDto> getItems() {
        return items;
    }

    public void setItems(List<RoadmapItemDto> items) {
        this.items = items;
    }
}
