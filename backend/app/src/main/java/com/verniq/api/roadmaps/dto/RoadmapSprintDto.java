package com.verniq.api.roadmaps.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class RoadmapSprintDto {
    private UUID id;
    private UUID roadmapId;
    private String title;
    private String slug;
    private String description;
    private Integer position;
    private Double estimatedHours;
    private String status;
    private List<RoadmapDayDto> days = new ArrayList<>();

    public RoadmapSprintDto() {}

    public RoadmapSprintDto(UUID id, UUID roadmapId, String title, String slug, String description,
                            Integer position, Double estimatedHours, String status, List<RoadmapDayDto> days) {
        this.id = id;
        this.roadmapId = roadmapId;
        this.title = title;
        this.slug = slug;
        this.description = description;
        this.position = position;
        this.estimatedHours = estimatedHours;
        this.status = status;
        this.days = days != null ? days : new ArrayList<>();
    }

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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<RoadmapDayDto> getDays() {
        return days;
    }

    public void setDays(List<RoadmapDayDto> days) {
        this.days = days;
    }
}
