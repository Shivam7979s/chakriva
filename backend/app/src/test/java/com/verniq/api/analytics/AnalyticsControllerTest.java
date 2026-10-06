package com.verniq.api.analytics;

import com.verniq.api.auth.AuthenticatedUser;
import com.verniq.api.auth.SupabaseAuthenticationToken;
import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.domain.ProblemDifficulty;
import com.verniq.api.problems.domain.ProblemLifecycleStatus;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.progress.domain.ProgressStatus;
import com.verniq.api.progress.domain.UserProblemProgress;
import com.verniq.api.progress.repository.UserProblemProgressRepository;
import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.domain.SubmissionStatus;
import com.verniq.api.submissions.repository.SubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private UserProblemProgressRepository progressRepository;

    @MockBean
    private com.verniq.api.submissions.queue.SubmissionQueueProducer queueProducer;

    private static final UUID USER_A_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID USER_B_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private Problem testProblem;

    @BeforeEach
    void setUp() {
        submissionRepository.deleteAll();
        progressRepository.deleteAll();
        problemRepository.deleteAll();

        testProblem = new Problem();
        testProblem.setVerniqId("VRQ-000001");
        testProblem.setTitle("Two Sum");
        testProblem.setSlug("two-sum");
        testProblem.setDifficulty(ProblemDifficulty.EASY);
        testProblem.setLifecycleStatus(ProblemLifecycleStatus.PUBLISHED);
        testProblem = problemRepository.save(testProblem);

        // User A solved the problem
        UserProblemProgress pA = new UserProblemProgress(USER_A_ID, testProblem);
        pA.setStatus(ProgressStatus.SOLVED.getDbValue());
        pA.setAttemptCount(2);
        pA.setFirstAttemptedAt(Instant.now().minusSeconds(3600));
        pA.setFirstSolvedAt(Instant.now().minusSeconds(1800));
        progressRepository.save(pA);

        // User A submissions
        Submission s1 = new Submission();
        s1.setUserId(USER_A_ID);
        s1.setProblem(testProblem);
        s1.setLanguage("java");
        s1.setSourceCode("code");
        s1.setStatus(SubmissionStatus.WRONG_ANSWER);
        submissionRepository.save(s1);

        Submission s2 = new Submission();
        s2.setUserId(USER_A_ID);
        s2.setProblem(testProblem);
        s2.setLanguage("java");
        s2.setSourceCode("code");
        s2.setStatus(SubmissionStatus.ACCEPTED);
        submissionRepository.save(s2);
    }

    private SupabaseAuthenticationToken createAuthToken(UUID userId, String email) {
        Jwt jwt = Jwt.withTokenValue("mock-jwt-token")
            .header("alg", "HS256")
            .claim("sub", userId.toString())
            .claim("email", email)
            .claim("role", "USER")
            .build();

        AuthenticatedUser principal = new AuthenticatedUser(
            userId, email, "USER",
            List.of(new SimpleGrantedAuthority("ROLE_USER")),
            Map.of("sub", userId.toString(), "email", email)
        );
        return new SupabaseAuthenticationToken(jwt, principal, principal.authorities());
    }

    @Test
    void testGetOverviewAuthenticatedUserA() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/overview")
                .with(authentication(createAuthToken(USER_A_ID, "usera@verniq.io"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.coding.problemsSolved", is(1)))
            .andExpect(jsonPath("$.data.coding.problemsAttempted", is(1)))
            .andExpect(jsonPath("$.data.coding.problemSolveRate", is(100.0)))
            .andExpect(jsonPath("$.data.coding.totalSubmissions", is(2)))
            .andExpect(jsonPath("$.data.coding.acceptedSubmissions", is(1)))
            .andExpect(jsonPath("$.data.coding.submissionAcceptanceRate", is(50.0)))
            .andExpect(jsonPath("$.data.coding.verdictDistribution.accepted", is(1)))
            .andExpect(jsonPath("$.data.coding.verdictDistribution.wrongAnswer", is(1)))
            .andExpect(jsonPath("$.data.difficulty.easy.solved", is(1)))
            .andExpect(jsonPath("$.data.trends", hasSize(6)))
            .andExpect(jsonPath("$.data.insights", not(empty())));
    }

    @Test
    void testUserIsolationUserBCannotSeeUserA() throws Exception {
        // User B has zero activity
        mockMvc.perform(get("/api/v1/analytics/overview")
                .with(authentication(createAuthToken(USER_B_ID, "userb@verniq.io"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.coding.problemsSolved", is(0)))
            .andExpect(jsonPath("$.data.coding.problemsAttempted", is(0)))
            .andExpect(jsonPath("$.data.coding.totalSubmissions", is(0)))
            .andExpect(jsonPath("$.data.coding.acceptedSubmissions", is(0)))
            .andExpect(jsonPath("$.data.difficulty.easy.solved", is(0)))
            .andExpect(jsonPath("$.data.insights[0].category", is("WELCOME")));
    }

    @Test
    void testUnauthenticatedAccessReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/overview"))
            .andExpect(status().isUnauthorized());
    }
}
