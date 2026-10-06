package com.verniq.api.roadmaps.dto;

import java.util.UUID;

public class RoadmapTopicDto {
    private UUID id;
    private UUID dayId;
    private String title;
    private String description;
    private Integer position;

    public RoadmapTopicDto() {}

    public RoadmapTopicDto(UUID id, UUID dayId, String title, String description, Integer position) {
        this.id = id;
        this.dayId = dayId;
        this.title = title;
        this.description = description;
        this.position = position;
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

    public Integer getPosition() {
        return position;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }
}
