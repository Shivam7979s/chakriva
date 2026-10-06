package com.verniq.api.problems.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.*;

/**
 * Problem aggregate root in the Verniq domain model.
 *
 * <p>Preserves permanent Verniq identifier (VRQ-XXXXXX), URL slug, difficulty,
 * lifecycle status, and relationship with taxonomy topics and companies.</p>
 */
@Entity
@Table(name = "problems")
public class Problem implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "verniq_id", unique = true, length = 32)
    private String verniqId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "difficulty", nullable = false)
    private String difficulty = "medium";

    @Column(name = "workflow_status", nullable = false)
    private String workflowStatus = "draft";

    @Column(name = "acceptance_rate")
    private Double acceptanceRate = 0.0;

    @Column(name = "description_markdown", columnDefinition = "TEXT")
    private String descriptionMarkdown;

    @Column(name = "constraints_markdown", columnDefinition = "TEXT")
    private String constraintsMarkdown;

    @Column(name = "starter_templates", columnDefinition = "TEXT")
    private String starterTemplates = "{}";

    @Column(name = "is_published", nullable = false)
    private boolean isPublished = false;

    @Column(name = "current_version", nullable = false)
    private int currentVersion = 1;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "problem_topics",
        joinColumns = @JoinColumn(name = "problem_id"),
        inverseJoinColumns = @JoinColumn(name = "topic_id")
    )
    private Set<Topic> topics = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "problem_companies",
        joinColumns = @JoinColumn(name = "problem_id"),
        inverseJoinColumns = @JoinColumn(name = "company_id")
    )
    private Set<Company> companies = new HashSet<>();

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<TestCase> testCases = new ArrayList<>();

    public Problem() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public ProblemDifficulty getDifficulty() {
        return ProblemDifficulty.fromString(this.difficulty);
    }

    public void setDifficulty(ProblemDifficulty diff) {
        this.difficulty = diff != null ? diff.name().toLowerCase(Locale.ROOT) : "medium";
    }

    public String getRawDifficulty() {
        return difficulty;
    }

    public void setRawDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public ProblemLifecycleStatus getLifecycleStatus() {
        return ProblemLifecycleStatus.fromDatabaseValue(this.workflowStatus);
    }

    public void setLifecycleStatus(ProblemLifecycleStatus status) {
        this.workflowStatus = status != null ? status.toDatabaseValue() : "draft";
        this.isPublished = (status == ProblemLifecycleStatus.PUBLISHED);
    }

    public String getRawWorkflowStatus() {
        return workflowStatus;
    }

    public void setRawWorkflowStatus(String workflowStatus) {
        this.workflowStatus = workflowStatus;
    }

    public Double getAcceptanceRate() {
        return acceptanceRate;
    }

    public void setAcceptanceRate(Double acceptanceRate) {
        this.acceptanceRate = acceptanceRate;
    }

    public String getDescriptionMarkdown() {
        return descriptionMarkdown;
    }

    public void setDescriptionMarkdown(String descriptionMarkdown) {
        this.descriptionMarkdown = descriptionMarkdown;
    }

    public String getConstraintsMarkdown() {
        return constraintsMarkdown;
    }

    public void setConstraintsMarkdown(String constraintsMarkdown) {
        this.constraintsMarkdown = constraintsMarkdown;
    }

    public String getStarterTemplates() {
        return starterTemplates;
    }

    public void setStarterTemplates(String starterTemplates) {
        this.starterTemplates = starterTemplates;
    }

    public boolean isPublished() {
        return isPublished || "published".equalsIgnoreCase(workflowStatus);
    }

    public void setPublished(boolean published) {
        isPublished = published;
    }

    public int getCurrentVersion() {
        return currentVersion;
    }

    public void setCurrentVersion(int currentVersion) {
        this.currentVersion = currentVersion;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Set<Topic> getTopics() {
        return topics;
    }

    public void setTopics(Set<Topic> topics) {
        this.topics = topics;
    }

    public Set<Company> getCompanies() {
        return companies;
    }

    public void setCompanies(Set<Company> companies) {
        this.companies = companies;
    }

    public List<TestCase> getTestCases() {
        return testCases;
    }

    public void setTestCases(List<TestCase> testCases) {
        this.testCases = testCases;
    }
}
