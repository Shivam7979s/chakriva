package com.verniq.api.roadmaps.dto;

import java.time.Instant;
import java.util.UUID;

public class CompleteItemResponse {
    private UUID itemId;
    private String status;
    private Instant completedAt;
    private String message;

    public CompleteItemResponse() {}

    public CompleteItemResponse(UUID itemId, String status, Instant completedAt, String message) {
        this.itemId = itemId;
        this.status = status;
        this.completedAt = completedAt;
        this.message = message;
    }

    public UUID getItemId() {
        return itemId;
    }

    public void setItemId(UUID itemId) {
        this.itemId = itemId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
