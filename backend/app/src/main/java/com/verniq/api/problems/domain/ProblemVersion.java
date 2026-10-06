package com.verniq.api.problems.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "problem_versions")
public class ProblemVersion implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "problem_id", nullable = false)
    private UUID problemId;

    @Column(name = "version_number", nullable = false)
    private int versionNumber = 1;

    @Column(name = "statement_markdown", nullable = false, columnDefinition = "TEXT")
    private String statementMarkdown;

    @Column(name = "constraints_markdown", columnDefinition = "TEXT")
    private String constraintsMarkdown;

    @Column(name = "input_format", columnDefinition = "TEXT")
    private String inputFormat;

    @Column(name = "output_format", columnDefinition = "TEXT")
    private String outputFormat;

    @Column(name = "changelog", columnDefinition = "TEXT")
    private String changelog;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    public ProblemVersion() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getProblemId() {
        return problemId;
    }

    public void setProblemId(UUID problemId) {
        this.problemId = problemId;
    }

    public int getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(int versionNumber) {
        this.versionNumber = versionNumber;
    }

    public String getStatementMarkdown() {
        return statementMarkdown;
    }

    public void setStatementMarkdown(String statementMarkdown) {
        this.statementMarkdown = statementMarkdown;
    }

    public String getConstraintsMarkdown() {
        return constraintsMarkdown;
    }

    public void setConstraintsMarkdown(String constraintsMarkdown) {
        this.constraintsMarkdown = constraintsMarkdown;
    }

    public String getInputFormat() {
        return inputFormat;
    }

    public void setInputFormat(String inputFormat) {
        this.inputFormat = inputFormat;
    }

    public String getOutputFormat() {
        return outputFormat;
    }

    public void setOutputFormat(String outputFormat) {
        this.outputFormat = outputFormat;
    }

    public String getChangelog() {
        return changelog;
    }

    public void setChangelog(String changelog) {
        this.changelog = changelog;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
