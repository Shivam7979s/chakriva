package com.verniq.api.roadmaps.dto;

import java.util.List;
import java.util.UUID;

public class NextRecommendedProblemDto {
    private String problemId;
    private String slug;
    private String title;
    private String difficulty;
    private List<String> topics;
    private String sprintTitle;
    private Integer dayNumber;
    private String dayTitle;
    private UUID itemId;
    private String itemTitle;
    private String reason;

    public NextRecommendedProblemDto() {}

    public NextRecommendedProblemDto(String problemId, String slug, String title, String difficulty,
                                     List<String> topics, String sprintTitle, Integer dayNumber,
                                     String dayTitle, UUID itemId, String itemTitle, String reason) {
        this.problemId = problemId;
        this.slug = slug;
        this.title = title;
        this.difficulty = difficulty;
        this.topics = topics;
        this.sprintTitle = sprintTitle;
        this.dayNumber = dayNumber;
        this.dayTitle = dayTitle;
        this.itemId = itemId;
        this.itemTitle = itemTitle;
        this.reason = reason;
    }

    public String getProblemId() {
        return problemId;
    }

    public void setProblemId(String problemId) {
        this.problemId = problemId;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
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

    public String getSprintTitle() {
        return sprintTitle;
    }

    public void setSprintTitle(String sprintTitle) {
        this.sprintTitle = sprintTitle;
    }

    public Integer getDayNumber() {
        return dayNumber;
    }

    public void setDayNumber(Integer dayNumber) {
        this.dayNumber = dayNumber;
    }

    public String getDayTitle() {
        return dayTitle;
    }

    public void setDayTitle(String dayTitle) {
        this.dayTitle = dayTitle;
    }

    public UUID getItemId() {
        return itemId;
    }

    public void setItemId(UUID itemId) {
        this.itemId = itemId;
    }

    public String getItemTitle() {
        return itemTitle;
    }

    public void setItemTitle(String itemTitle) {
        this.itemTitle = itemTitle;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
