package com.verniq.api.submissions.domain;

import com.verniq.api.problems.domain.Problem;
import jakarta.persistence.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Submission aggregate root representing a user's code submission to the online judge.
 */
@Entity
@Table(name = "submissions")
public class Submission implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id")
    private Problem problem;

    @Column(name = "problem_version", nullable = false)
    private int problemVersion = 1;

    @Column(name = "language", nullable = false)
    private String language;

    @Column(name = "source_code", nullable = false, columnDefinition = "TEXT")
    private String sourceCode;

    @Column(name = "stdin_input", columnDefinition = "TEXT")
    private String stdinInput;

    @Column(name = "verdict", nullable = false)
    private String verdict = "pending";

    @Column(name = "score")
    private Double score = 0.0;

    @Column(name = "runtime_ms")
    private Integer runtimeMs = 0;

    @Column(name = "memory_kb")
    private Integer memoryKb = 0;

    @Column(name = "failed_test_index")
    private Integer failedTestIndex;

    @Column(name = "test_cases_passed")
    private Integer testCasesPassed = 0;

    @Column(name = "total_test_cases")
    private Integer totalTestCases = 0;

    @Column(name = "stdout_output", columnDefinition = "TEXT")
    private String stdoutOutput;

    @Column(name = "stderr_output", columnDefinition = "TEXT")
    private String stderrOutput;

    @Column(name = "compile_output", columnDefinition = "TEXT")
    private String compileOutput;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "judge_job_id")
    private String judgeJobId;

    @Column(name = "is_custom_run", nullable = false)
    private boolean isCustomRun = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "queued_at")
    private Instant queuedAt = Instant.now();

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    public Submission() {}

    public SubmissionStatus getStatus() {
        return SubmissionStatus.fromDbVerdict(this.verdict);
    }

    public void setStatus(SubmissionStatus status) {
        if (status != null) {
            this.verdict = status.toDbVerdict();
        }
    }

    public void markProcessing() {
        SubmissionStatus current = getStatus();
        if (!current.canTransitionTo(SubmissionStatus.PROCESSING)) {
            throw new IllegalStateException("Cannot transition from " + current + " to PROCESSING");
        }
        setStatus(SubmissionStatus.PROCESSING);
        this.startedAt = Instant.now();
    }

    public void markComplete(SubmissionStatus finalVerdict, Integer runtimeMs, Integer memoryKb,
                             Integer passedTests, Integer totalTests, Integer failedIndex,
                             String compileOut, String stderrOut, String errorMsg) {
        SubmissionStatus current = getStatus();
        if (!current.canTransitionTo(finalVerdict)) {
            throw new IllegalStateException("Cannot transition from " + current + " to " + finalVerdict);
        }
        setStatus(finalVerdict);
        if (runtimeMs != null) this.runtimeMs = runtimeMs;
        if (memoryKb != null) this.memoryKb = memoryKb;
        if (passedTests != null) this.testCasesPassed = passedTests;
        if (totalTests != null) this.totalTestCases = totalTests;
        this.failedTestIndex = failedIndex;
        this.compileOutput = compileOut;
        this.stderrOutput = stderrOut;
        this.errorMessage = errorMsg;
        this.completedAt = Instant.now();

        if (totalTestCases != null && totalTestCases > 0 && testCasesPassed != null) {
            this.score = Math.round(((double) testCasesPassed / totalTestCases) * 10000.0) / 100.0;
        }
    }

    // Getters and Setters

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public Problem getProblem() {
        return problem;
    }

    public void setProblem(Problem problem) {
        this.problem = problem;
    }

    public int getProblemVersion() {
        return problemVersion;
    }

    public void setProblemVersion(int problemVersion) {
        this.problemVersion = problemVersion;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getSourceCode() {
        return sourceCode;
    }

    public void setSourceCode(String sourceCode) {
        this.sourceCode = sourceCode;
    }

    public String getStdinInput() {
        return stdinInput;
    }

    public void setStdinInput(String stdinInput) {
        this.stdinInput = stdinInput;
    }

    public String getVerdict() {
        return verdict;
    }

    public void setVerdict(String verdict) {
        this.verdict = verdict;
    }

    public Double getScore() {
        return score;
    }

    public void setScore(Double score) {
        this.score = score;
    }

    public Integer getRuntimeMs() {
        return runtimeMs;
    }

    public void setRuntimeMs(Integer runtimeMs) {
        this.runtimeMs = runtimeMs;
    }

    public Integer getMemoryKb() {
        return memoryKb;
    }

    public void setMemoryKb(Integer memoryKb) {
        this.memoryKb = memoryKb;
    }

    public Integer getFailedTestIndex() {
        return failedTestIndex;
    }

    public void setFailedTestIndex(Integer failedTestIndex) {
        this.failedTestIndex = failedTestIndex;
    }

    public Integer getTestCasesPassed() {
        return testCasesPassed;
    }

    public void setTestCasesPassed(Integer testCasesPassed) {
        this.testCasesPassed = testCasesPassed;
    }

    public Integer getTotalTestCases() {
        return totalTestCases;
    }

    public void setTotalTestCases(Integer totalTestCases) {
        this.totalTestCases = totalTestCases;
    }

    public String getStdoutOutput() {
        return stdoutOutput;
    }

    public void setStdoutOutput(String stdoutOutput) {
        this.stdoutOutput = stdoutOutput;
    }

    public String getStderrOutput() {
        return stderrOutput;
    }

    public void setStderrOutput(String stderrOutput) {
        this.stderrOutput = stderrOutput;
    }

    public String getCompileOutput() {
        return compileOutput;
    }

    public void setCompileOutput(String compileOutput) {
        this.compileOutput = compileOutput;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public String getJudgeJobId() {
        return judgeJobId;
    }

    public void setJudgeJobId(String judgeJobId) {
        this.judgeJobId = judgeJobId;
    }

    public boolean isCustomRun() {
        return isCustomRun;
    }

    public void setCustomRun(boolean customRun) {
        isCustomRun = customRun;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getQueuedAt() {
        return queuedAt;
    }

    public void setQueuedAt(Instant queuedAt) {
        this.queuedAt = queuedAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }
}
