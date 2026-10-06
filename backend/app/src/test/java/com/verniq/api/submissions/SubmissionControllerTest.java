package com.verniq.api.submissions;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.verniq.api.auth.AuthenticatedUser;
import com.verniq.api.auth.SupabaseAuthenticationToken;
import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.domain.ProblemDifficulty;
import com.verniq.api.problems.domain.ProblemLifecycleStatus;
import com.verniq.api.problems.domain.TestCase;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.domain.SubmissionStatus;
import com.verniq.api.submissions.dto.CreateSubmissionRequest;
import com.verniq.api.submissions.dto.JudgeResultCallbackRequest;
import com.verniq.api.submissions.repository.SubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SubmissionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private ProblemRepository problemRepository;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.verniq.api.submissions.queue.SubmissionQueueProducer queueProducer;

    @org.springframework.beans.factory.annotation.Value("${verniq.judge.internal-secret}")
    private String testInternalSecret;

    private static final UUID USER_A_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID USER_B_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private Problem publishedProblem;
    private Problem draftProblem;

    @BeforeEach
    void setUp() {
        submissionRepository.deleteAll();
        problemRepository.deleteAll();

        // 1. Published Problem with sample and hidden test cases
        publishedProblem = problemRepository.findByVerniqId("VRQ-000001").orElseGet(() -> {
            Problem p = new Problem();
            p.setVerniqId("VRQ-000001");
            p.setTitle("Two Sum");
            p.setSlug("two-sum");
            p.setDifficulty(ProblemDifficulty.EASY);
            p.setLifecycleStatus(ProblemLifecycleStatus.PUBLISHED);
            p.setCurrentVersion(1);
            p.setPublishedAt(Instant.now());

            TestCase sampleCase = new TestCase();
            sampleCase.setProblem(p);
            sampleCase.setInput("nums = [2,7,11,15], target = 9");
            sampleCase.setExpectedOutput("[0,1]");
            sampleCase.setSample(true);
            sampleCase.setOrderIndex(1);

            TestCase hiddenCase = new TestCase();
            hiddenCase.setProblem(p);
            hiddenCase.setInput("SECRET_CANONICAL_INPUT_DATA_XYZ_9999");
            hiddenCase.setExpectedOutput("SECRET_CANONICAL_EXPECTED_HASH_8888");
            hiddenCase.setSample(false);
            hiddenCase.setOrderIndex(2);

            p.getTestCases().add(sampleCase);
            p.getTestCases().add(hiddenCase);
            return problemRepository.save(p);
        });

        // 2. Draft Problem
        draftProblem = problemRepository.findByVerniqId("VRQ-000099").orElseGet(() -> {
            Problem p = new Problem();
            p.setVerniqId("VRQ-000099");
            p.setTitle("Draft Problem");
            p.setSlug("draft-problem");
            p.setDifficulty(ProblemDifficulty.HARD);
            p.setLifecycleStatus(ProblemLifecycleStatus.DRAFT);
            return problemRepository.save(p);
        });
    }

    private SupabaseAuthenticationToken createMockAuth(UUID userId, String role) {
        Jwt jwt = Jwt.withTokenValue("mock-token")
            .header("alg", "HS256")
            .claim("sub", userId.toString())
            .claim("email", "user@verniq.io")
            .claim("role", role)
            .build();

        AuthenticatedUser user = new AuthenticatedUser(
            userId,
            "user@verniq.io",
            role,
            List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase(Locale.ROOT))),
            Collections.emptyMap()
        );

        return new SupabaseAuthenticationToken(jwt, user, user.authorities());
    }

    @Test
    @DisplayName("POST /api/v1/submissions creates and enqueues submission for authenticated user")
    void testCreateSubmissionSuccess() throws Exception {
        CreateSubmissionRequest request = new CreateSubmissionRequest(
            "VRQ-000001",
            "JAVA",
            "class Solution { public int[] twoSum(int[] nums, int target) { return new int[]{0,1}; } }"
        );

        mockMvc.perform(post("/api/v1/submissions")
                .with(authentication(createMockAuth(USER_A_ID, "USER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.submissionId").exists())
            .andExpect(jsonPath("$.data.problemId").value("VRQ-000001"))
            .andExpect(jsonPath("$.data.language").value("JAVA"))
            .andExpect(jsonPath("$.data.status").value("QUEUED"));
    }

    @Test
    @DisplayName("POST /api/v1/submissions returns 401 for anonymous client")
    void testCreateSubmissionAnonymousFails() throws Exception {
        CreateSubmissionRequest request = new CreateSubmissionRequest(
            "VRQ-000001", "JAVA", "class Solution {}"
        );

        mockMvc.perform(post("/api/v1/submissions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/v1/submissions returns 400 when submitting against unpublished problem")
    void testCreateSubmissionUnpublishedProblemFails() throws Exception {
        CreateSubmissionRequest request = new CreateSubmissionRequest(
            "VRQ-000099", "PYTHON", "def solve(): pass"
        );

        mockMvc.perform(post("/api/v1/submissions")
                .with(authentication(createMockAuth(USER_A_ID, "USER")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("BAD_REQUEST"));
    }

    @Test
    @DisplayName("GET /api/v1/submissions/{id} allows owner to view submission details")
    void testGetSubmissionForOwner() throws Exception {
        Submission sub = new Submission();
        sub.setUserId(USER_A_ID);
        sub.setProblem(publishedProblem);
        sub.setLanguage("java");
        sub.setSourceCode("class Solution {}");
        sub.setStatus(SubmissionStatus.QUEUED);
        sub = submissionRepository.save(sub);

        mockMvc.perform(get("/api/v1/submissions/" + sub.getId())
                .with(authentication(createMockAuth(USER_A_ID, "USER"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").value(sub.getId().toString()))
            .andExpect(jsonPath("$.data.problemVerniqId").value("VRQ-000001"))
            .andExpect(jsonPath("$.data.status").value("QUEUED"));
    }

    @Test
    @DisplayName("GET /api/v1/submissions/{id} returns 404 when User B tries to view User A's submission")
    void testGetSubmissionEnforcesUserIsolation() throws Exception {
        Submission sub = new Submission();
        sub.setUserId(USER_A_ID);
        sub.setProblem(publishedProblem);
        sub.setLanguage("java");
        sub.setSourceCode("class Solution {}");
        sub = submissionRepository.save(sub);

        mockMvc.perform(get("/api/v1/submissions/" + sub.getId())
                .with(authentication(createMockAuth(USER_B_ID, "USER"))))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @DisplayName("POST /api/v1/internal/judge/results accepts verdict callback with valid secret")
    void testJudgeCallbackSuccess() throws Exception {
        Submission sub = new Submission();
        sub.setUserId(USER_A_ID);
        sub.setProblem(publishedProblem);
        sub.setLanguage("java");
        sub.setSourceCode("class Solution {}");
        sub.setStatus(SubmissionStatus.QUEUED);
        sub = submissionRepository.save(sub);

        JudgeResultCallbackRequest callback = new JudgeResultCallbackRequest(
            1, "job_test_123", sub.getId(), "accepted",
            120, 2048, 15, 15, null,
            "Compiling...", null, null, null
        );

        mockMvc.perform(post("/api/v1/internal/judge/results")
                .header("X-Internal-Secret", testInternalSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("ACCEPTED"))
            .andExpect(jsonPath("$.data.runtimeMs").value(120))
            .andExpect(jsonPath("$.data.testCasesPassed").value(15));
    }

    @Test
    @DisplayName("POST /api/v1/internal/judge/results rejects callback with missing secret header")
    void testJudgeCallbackUnauthorizedMissingSecret() throws Exception {
        JudgeResultCallbackRequest callback = new JudgeResultCallbackRequest(
            1, "job_test", UUID.randomUUID(), "accepted",
            50, 1024, 1, 1, null, null, null, null, null
        );

        mockMvc.perform(post("/api/v1/internal/judge/results")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/v1/internal/judge/results rejects callback with wrong secret header")
    void testJudgeCallbackUnauthorizedWrongSecret() throws Exception {
        JudgeResultCallbackRequest callback = new JudgeResultCallbackRequest(
            1, "job_test", UUID.randomUUID(), "accepted",
            50, 1024, 1, 1, null, null, null, null, null
        );

        mockMvc.perform(post("/api/v1/internal/judge/results")
                .header("X-Internal-Secret", "completely-incorrect-secret-value")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/v1/internal/judge/results rejects callback with empty secret header")
    void testJudgeCallbackUnauthorizedEmptySecret() throws Exception {
        JudgeResultCallbackRequest callback = new JudgeResultCallbackRequest(
            1, "job_test", UUID.randomUUID(), "accepted",
            50, 1024, 1, 1, null, null, null, null, null
        );

        mockMvc.perform(post("/api/v1/internal/judge/results")
                .header("X-Internal-Secret", "   ")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("SECURITY REGRESSION: Hidden canonical test data is NEVER exposed in submission responses")
    void testHiddenTestDataNeverExposedInSubmissionApi() throws Exception {
        Submission sub = new Submission();
        sub.setUserId(USER_A_ID);
        sub.setProblem(publishedProblem);
        sub.setLanguage("java");
        sub.setSourceCode("class Solution {}");
        sub.setStatus(SubmissionStatus.WRONG_ANSWER);
        sub.markComplete(SubmissionStatus.WRONG_ANSWER, 85, 2048, 1, 2, 2, null, null, "Mismatch at test index 2");
        sub = submissionRepository.save(sub);

        mockMvc.perform(get("/api/v1/submissions/" + sub.getId())
                .with(authentication(createMockAuth(USER_A_ID, "USER"))))
            .andExpect(status().isOk())
            .andExpect(content().string(not(containsString("SECRET_CANONICAL_INPUT_DATA_XYZ_9999"))))
            .andExpect(content().string(not(containsString("SECRET_CANONICAL_EXPECTED_HASH_8888"))))
            .andExpect(content().string(not(containsString("referenceSolution"))))
            .andExpect(content().string(not(containsString("judgeConfig"))));
    }
}
