package com.verniq.api.problems.domain;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "test_cases")
public class TestCase implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String input;

    @Column(name = "expected_output", nullable = false, columnDefinition = "TEXT")
    private String expectedOutput;

    @Column(name = "is_sample", nullable = false)
    private boolean isSample = false;

    @Column(name = "order_index", nullable = false)
    private int orderIndex = 0;

    public TestCase() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Problem getProblem() {
        return problem;
    }

    public void setProblem(Problem problem) {
        this.problem = problem;
    }

    public String getInput() {
        return input;
    }

    public void setInput(String input) {
        this.input = input;
    }

    public String getExpectedOutput() {
        return expectedOutput;
    }

    public void setExpectedOutput(String expectedOutput) {
        this.expectedOutput = expectedOutput;
    }

    public boolean isSample() {
        return isSample;
    }

    public void setSample(boolean sample) {
        isSample = sample;
    }

    public int getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(int orderIndex) {
        this.orderIndex = orderIndex;
    }
}
