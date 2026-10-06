package com.verniq.api.roadmaps.dto;

import java.util.UUID;

public class RoadmapProblemReferenceDto {
    private UUID id;
    private String verniqProblemId;
    private RoadmapProblemSummaryDto problemSummary;
    private Integer position;
    private Boolean required;
    private String notes;

    public RoadmapProblemReferenceDto() {}

    public RoadmapProblemReferenceDto(UUID id, String verniqProblemId, RoadmapProblemSummaryDto problemSummary,
                                      Integer position, Boolean required, String notes) {
        this.id = id;
        this.verniqProblemId = verniqProblemId;
        this.problemSummary = problemSummary;
        this.position = position;
        this.required = required;
        this.notes = notes;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getVerniqProblemId() {
        return verniqProblemId;
    }

    public void setVerniqProblemId(String verniqProblemId) {
        this.verniqProblemId = verniqProblemId;
    }

    public RoadmapProblemSummaryDto getProblemSummary() {
        return problemSummary;
    }

    public void setProblemSummary(RoadmapProblemSummaryDto problemSummary) {
        this.problemSummary = problemSummary;
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
}
