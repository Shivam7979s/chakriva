package com.verniq.api.problems;

import com.verniq.api.problems.domain.*;
import com.verniq.api.problems.repository.CompanyRepository;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.problems.repository.TopicRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProblemCatalogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private TopicRepository topicRepository;

    @Autowired
    private CompanyRepository companyRepository;

    private Problem publishedProblem;
    private Problem draftProblem;

    @BeforeEach
    void setupTestData() {
        problemRepository.deleteAll();
        topicRepository.deleteAll();
        companyRepository.deleteAll();

        Topic arraysTopic = topicRepository.save(new Topic(UUID.randomUUID(), "Arrays", "arrays"));
        Topic dpTopic = topicRepository.save(new Topic(UUID.randomUUID(), "Dynamic Programming", "dynamic-programming"));
        Company google = companyRepository.save(new Company(UUID.randomUUID(), "Google", "google", "https://img.verniq.io/google.svg"));

        // 1. Published Problem with both Sample and Hidden test cases
        publishedProblem = new Problem();
        publishedProblem.setVerniqId("VRQ-000001");
        publishedProblem.setTitle("Two Sum");
        publishedProblem.setSlug("two-sum");
        publishedProblem.setDifficulty(ProblemDifficulty.EASY);
        publishedProblem.setLifecycleStatus(ProblemLifecycleStatus.PUBLISHED);
        publishedProblem.setAcceptanceRate(82.4);
        publishedProblem.setDescriptionMarkdown("Given an array of integers `nums` and an integer `target`, return indices...");
        publishedProblem.setConstraintsMarkdown("- 2 <= nums.length <= 10^4");
        publishedProblem.setStarterTemplates("{\"python\":\"def twoSum(nums, target): pass\",\"java\":\"class Solution {}\"}");
        publishedProblem.setCurrentVersion(1);
        publishedProblem.setPublishedAt(Instant.now());
        publishedProblem.setTopics(Set.of(arraysTopic));
        publishedProblem.setCompanies(Set.of(google));

        // Sample test case (visible to user)
        TestCase sampleCase = new TestCase();
        sampleCase.setProblem(publishedProblem);
        sampleCase.setInput("nums = [2,7,11,15], target = 9");
        sampleCase.setExpectedOutput("[0,1]");
        sampleCase.setSample(true);
        sampleCase.setOrderIndex(1);

        // Hidden canonical test case (strictly private to online judge)
        TestCase hiddenCase = new TestCase();
        hiddenCase.setProblem(publishedProblem);
        hiddenCase.setInput("SECRET_ADVERSARIAL_INPUT_LARGE_ARRAY_10000");
        hiddenCase.setExpectedOutput("SECRET_EXPECTED_HASH_OUTPUT_VALUE");
        hiddenCase.setSample(false);
        hiddenCase.setOrderIndex(2);

        publishedProblem.getTestCases().add(sampleCase);
        publishedProblem.getTestCases().add(hiddenCase);
        publishedProblem = problemRepository.save(publishedProblem);

        // 2. Draft Problem (Unpublished)
        draftProblem = new Problem();
        draftProblem.setVerniqId("VRQ-000099");
        draftProblem.setTitle("Internal Draft Graph Problem");
        draftProblem.setSlug("internal-draft-graph-problem");
        draftProblem.setDifficulty(ProblemDifficulty.HARD);
        draftProblem.setLifecycleStatus(ProblemLifecycleStatus.DRAFT);
        draftProblem.setDescriptionMarkdown("Unreleased problem description");
        draftProblem.setTopics(Set.of(dpTopic));
        draftProblem = problemRepository.save(draftProblem);
    }

    @Test
    @DisplayName("GET /api/v1/problems returns list of published problems with pagination metadata")
    void testListPublishedProblems() throws Exception {
        mockMvc.perform(get("/api/v1/problems"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content", hasSize(1)))
            .andExpect(jsonPath("$.data.content[0].verniqId").value("VRQ-000001"))
            .andExpect(jsonPath("$.data.content[0].title").value("Two Sum"))
            .andExpect(jsonPath("$.data.content[0].difficulty").value("EASY"))
            .andExpect(jsonPath("$.data.content[0].topics", hasItem("Arrays")))
            .andExpect(jsonPath("$.data.content[0].companies", hasItem("Google")))
            .andExpect(jsonPath("$.data.totalElements").value(1))
            // Ensure draft problem is not listed
            .andExpect(jsonPath("$.data.content[*].verniqId", not(hasItem("VRQ-000099"))));
    }

    @Test
    @DisplayName("GET /api/v1/problems/{verniqId} retrieves full public details of a published problem")
    void testGetPublishedProblemByVerniqId() throws Exception {
        mockMvc.perform(get("/api/v1/problems/VRQ-000001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.verniqId").value("VRQ-000001"))
            .andExpect(jsonPath("$.data.title").value("Two Sum"))
            .andExpect(jsonPath("$.data.slug").value("two-sum"))
            .andExpect(jsonPath("$.data.difficulty").value("EASY"))
            .andExpect(jsonPath("$.data.statement", containsString("Given an array of integers")))
            .andExpect(jsonPath("$.data.constraints", containsString("2 <= nums.length")))
            .andExpect(jsonPath("$.data.examples", hasSize(1)))
            .andExpect(jsonPath("$.data.examples[0].input", containsString("nums = [2,7,11,15]")))
            .andExpect(jsonPath("$.data.starterTemplates.python", containsString("def twoSum")))
            .andExpect(jsonPath("$.data.currentVersion").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/problems/{slug} allows retrieval by valid problem slug")
    void testGetPublishedProblemBySlug() throws Exception {
        mockMvc.perform(get("/api/v1/problems/two-sum"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.verniqId").value("VRQ-000001"));
    }

    @Test
    @DisplayName("GET /api/v1/problems/{verniqId} returns 404 for unknown Verniq ID")
    void testUnknownVerniqIdReturns404() throws Exception {
        mockMvc.perform(get("/api/v1/problems/VRQ-999999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"))
            .andExpect(jsonPath("$.requestId").exists());
    }

    @Test
    @DisplayName("Visibility Rule: GET /api/v1/problems/{verniqId} returns 404 for unpublished (DRAFT) problem")
    void testUnpublishedProblemReturns404() throws Exception {
        mockMvc.perform(get("/api/v1/problems/VRQ-000099"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @DisplayName("Filtering: Filter by difficulty, topic, and company")
    void testCatalogFilters() throws Exception {
        // Match EASY difficulty
        mockMvc.perform(get("/api/v1/problems?difficulty=EASY"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content", hasSize(1)));

        // No match for HARD difficulty among published problems
        mockMvc.perform(get("/api/v1/problems?difficulty=HARD"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content", hasSize(0)));

        // Match topic
        mockMvc.perform(get("/api/v1/problems?topic=arrays"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content", hasSize(1)));

        // Match company
        mockMvc.perform(get("/api/v1/problems?company=google"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content", hasSize(1)));

        // Substring search
        mockMvc.perform(get("/api/v1/problems?search=Two"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content", hasSize(1)));
    }

    @Test
    @DisplayName("SECURITY REGRESSION: Hidden canonical test data and internal judge secrets are NEVER exposed")
    void testHiddenTestDataNeverExposedInApiResponse() throws Exception {
        mockMvc.perform(get("/api/v1/problems/VRQ-000001"))
            .andExpect(status().isOk())
            // Sample test case input and output ARE present
            .andExpect(jsonPath("$.data.examples[0].input", containsString("nums = [2,7,11,15]")))
            .andExpect(jsonPath("$.data.examples[0].output", equalTo("[0,1]")))
            // Hidden canonical test data MUST NOT appear anywhere in the response
            .andExpect(content().string(not(containsString("SECRET_ADVERSARIAL_INPUT_LARGE_ARRAY_10000"))))
            .andExpect(content().string(not(containsString("SECRET_EXPECTED_HASH_OUTPUT_VALUE"))))
            .andExpect(content().string(not(containsString("referenceSolution"))))
            .andExpect(content().string(not(containsString("judgeConfig"))))
            .andExpect(content().string(not(containsString("privateNotes"))));
    }
}
