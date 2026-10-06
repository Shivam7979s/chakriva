package com.verniq.api.roadmaps.dto;

import java.util.UUID;

public class RoadmapProgressSummaryDto {
    private UUID roadmapId;
    private String roadmapTitle;
    private String roadmapSlug;
    private Integer totalNodes;
    private Integer completedNodes;
    private Integer availableNodes;
    private Integer inProgressNodes;
    private Integer lockedNodes;
    private Integer totalItems;
    private Integer completedItems;
    private Double progressPercent;
    private String currentSprintTitle;
    private Integer currentDayNumber;

    public RoadmapProgressSummaryDto() {}

    public RoadmapProgressSummaryDto(UUID roadmapId, String roadmapTitle, String roadmapSlug,
                                     Integer totalNodes, Integer completedNodes, Integer availableNodes,
                                     Integer inProgressNodes, Integer lockedNodes,
                                     Integer totalItems, Integer completedItems, Double progressPercent,
                                     String currentSprintTitle, Integer currentDayNumber) {
        this.roadmapId = roadmapId;
        this.roadmapTitle = roadmapTitle;
        this.roadmapSlug = roadmapSlug;
        this.totalNodes = totalNodes;
        this.completedNodes = completedNodes;
        this.availableNodes = availableNodes;
        this.inProgressNodes = inProgressNodes;
        this.lockedNodes = lockedNodes;
        this.totalItems = totalItems;
        this.completedItems = completedItems;
        this.progressPercent = progressPercent;
        this.currentSprintTitle = currentSprintTitle;
        this.currentDayNumber = currentDayNumber;
    }

    public UUID getRoadmapId() {
        return roadmapId;
    }

    public void setRoadmapId(UUID roadmapId) {
        this.roadmapId = roadmapId;
    }

    public String getRoadmapTitle() {
        return roadmapTitle;
    }

    public void setRoadmapTitle(String roadmapTitle) {
        this.roadmapTitle = roadmapTitle;
    }

    public String getRoadmapSlug() {
        return roadmapSlug;
    }

    public void setRoadmapSlug(String roadmapSlug) {
        this.roadmapSlug = roadmapSlug;
    }

    public Integer getTotalNodes() {
        return totalNodes;
    }

    public void setTotalNodes(Integer totalNodes) {
        this.totalNodes = totalNodes;
    }

    public Integer getCompletedNodes() {
        return completedNodes;
    }

    public void setCompletedNodes(Integer completedNodes) {
        this.completedNodes = completedNodes;
    }

    public Integer getAvailableNodes() {
        return availableNodes;
    }

    public void setAvailableNodes(Integer availableNodes) {
        this.availableNodes = availableNodes;
    }

    public Integer getInProgressNodes() {
        return inProgressNodes;
    }

    public void setInProgressNodes(Integer inProgressNodes) {
        this.inProgressNodes = inProgressNodes;
    }

    public Integer getLockedNodes() {
        return lockedNodes;
    }

    public void setLockedNodes(Integer lockedNodes) {
        this.lockedNodes = lockedNodes;
    }

    public Integer getTotalItems() {
        return totalItems;
    }

    public void setTotalItems(Integer totalItems) {
        this.totalItems = totalItems;
    }

    public Integer getCompletedItems() {
        return completedItems;
    }

    public void setCompletedItems(Integer completedItems) {
        this.completedItems = completedItems;
    }

    public Double getProgressPercent() {
        return progressPercent;
    }

    public void setProgressPercent(Double progressPercent) {
        this.progressPercent = progressPercent;
    }

    public String getCurrentSprintTitle() {
        return currentSprintTitle;
    }

    public void setCurrentSprintTitle(String currentSprintTitle) {
        this.currentSprintTitle = currentSprintTitle;
    }

    public Integer getCurrentDayNumber() {
        return currentDayNumber;
    }

    public void setCurrentDayNumber(Integer currentDayNumber) {
        this.currentDayNumber = currentDayNumber;
    }
}
