package com.verniq.api.roadmaps.dto;

import java.util.UUID;

public class RoadmapSummaryDto {
    private UUID id;
    private String title;
    private String slug;
    private String description;
    private String estimatedDuration;
    private Integer totalSprints;
    private String iconName;
    private Double progressPercent;
    private Integer completedItems;
    private Integer totalItems;
    private String status;

    public RoadmapSummaryDto() {}

    public RoadmapSummaryDto(UUID id, String title, String slug, String description,
                             String estimatedDuration, Integer totalSprints, String iconName,
                             Double progressPercent, Integer completedItems, Integer totalItems,
                             String status) {
        this.id = id;
        this.title = title;
        this.slug = slug;
        this.description = description;
        this.estimatedDuration = estimatedDuration;
        this.totalSprints = totalSprints;
        this.iconName = iconName;
        this.progressPercent = progressPercent;
        this.completedItems = completedItems;
        this.totalItems = totalItems;
        this.status = status;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public String getEstimatedDuration() {
        return estimatedDuration;
    }

    public void setEstimatedDuration(String estimatedDuration) {
        this.estimatedDuration = estimatedDuration;
    }

    public Integer getTotalSprints() {
        return totalSprints;
    }

    public void setTotalSprints(Integer totalSprints) {
        this.totalSprints = totalSprints;
    }

    public String getIconName() {
        return iconName;
    }

    public void setIconName(String iconName) {
        this.iconName = iconName;
    }

    public Double getProgressPercent() {
        return progressPercent;
    }

    public void setProgressPercent(Double progressPercent) {
        this.progressPercent = progressPercent;
    }

    public Integer getCompletedItems() {
        return completedItems;
    }

    public void setCompletedItems(Integer completedItems) {
        this.completedItems = completedItems;
    }

    public Integer getTotalItems() {
        return totalItems;
    }

    public void setTotalItems(Integer totalItems) {
        this.totalItems = totalItems;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
