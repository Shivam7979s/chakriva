package com.verniq.api.roadmaps.dto;

import java.util.List;

public class RoadmapProblemSummaryDto {
    private String verniqId;
    private String title;
    private String slug;
    private String difficulty;
    private List<String> topics;
    private String userStatus;

    public RoadmapProblemSummaryDto() {}

    public RoadmapProblemSummaryDto(String verniqId, String title, String slug, String difficulty, List<String> topics, String userStatus) {
        this.verniqId = verniqId;
        this.title = title;
        this.slug = slug;
        this.difficulty = difficulty;
        this.topics = topics;
        this.userStatus = userStatus;
    }

    public String getVerniqId() {
        return verniqId;
    }

    public void setVerniqId(String verniqId) {
        this.verniqId = verniqId;
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

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public List<String> getTopics() {
        return topics;
    }

    public void setTopics(List<String> topics) {
        this.topics = topics;
    }

    public String getUserStatus() {
        return userStatus;
    }

    public void setUserStatus(String userStatus) {
        this.userStatus = userStatus;
    }
}
