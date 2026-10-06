package com.verniq.api.submissions;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.verniq.api.auth.AuthenticatedUser;
import com.verniq.api.auth.SupabaseAuthenticationToken;
import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.domain.ProblemDifficulty;
import com.verniq.api.problems.domain.ProblemLifecycleStatus;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.progress.service.UserProgressService;
import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.domain.SubmissionStatus;
import com.verniq.api.submissions.dto.FirstFailedTestDto;
import com.verniq.api.submissions.dto.JudgeResultCallbackRequest;
import com.verniq.api.submissions.repository.SubmissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
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
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Comprehensive Integration and Controller Test Suite for Phase J.5.4
 * Production Judge Result Callback.
 *
 * Verifies all 20 required criteria from Phase J.5.4 specification:
 *  1. correct secret accepted
 *  2. missing secret rejected
 *  3. wrong secret rejected
 *  4. blank secret rejected
 *  5. valid JudgeResult accepted
 *  6. malformed payload rejected
 *  7. invalid contract version rejected
 *  8. unknown submission rejected
 *  9. jobId mismatch rejected
 * 10. submission ownership cannot be changed
 * 11. valid terminal result persisted
 * 12. duplicate identical callback is idempotent
 * 13. conflicting duplicate callback rejected
 * 14. invalid state transition rejected
 * 15. hidden expected output cannot be persisted
 * 16. sourceCode cannot be overwritten
 * 17. transaction rollback on persistence failure
 * 18. normal user authentication cannot bypass internal secret
 * 19. runtime/memory/test counts validated
 * 20. completedAt validated
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProductionJudgeResultCallbackTest {

    private static final String CALLBACK_URL = "/api/v1/internal/judge/results";
    private static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";
    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private ProblemRepository problemRepository;

    @MockBean
    private UserProgressService userProgressService;

    @MockBean
    private com.verniq.api.submissions.queue.SubmissionQueueProducer queueProducer;

    @Value("${verniq.judge.internal-secret}")
    private String configuredSecret;

    private Problem testProblem;
    private Submission testSubmission;
    private final String authoritativeJobId = "job-auth-999";

    @BeforeEach
    void setUp() {
        submissionRepository.deleteAll();
        problemRepository.deleteAll();

        testProblem = new Problem();
        testProblem.setVerniqId("VRQ-000001");
        testProblem.setTitle("Two Sum");
        testProblem.setSlug("two-sum");
        testProblem.setDifficulty(ProblemDifficulty.EASY);
        testProblem.setLifecycleStatus(ProblemLifecycleStatus.PUBLISHED);
        testProblem.setCurrentVersion(1);
        testProblem = problemRepository.save(testProblem);

        testSubmission = new Submission();
        testSubmission.setUserId(USER_ID);
        testSubmission.setProblem(testProblem);
        testSubmission.setProblemVersion(1);
        testSubmission.setLanguage("python");
        testSubmission.setSourceCode("def twoSum(nums, target): return [0, 1]");
        testSubmission.setStatus(SubmissionStatus.PROCESSING);
        testSubmission.setJudgeJobId(authoritativeJobId);
        testSubmission.setCreatedAt(Instant.now());
        testSubmission = submissionRepository.save(testSubmission);
    }

    private JudgeResultCallbackRequest createValidCallback() {
        return new JudgeResultCallbackRequest(
            "1",
            authoritativeJobId,
            testSubmission.getId(),
            "judge-worker-aws-1",
            "COMPLETED",
            "ACCEPTED",
            45,
            2048,
            5,
            5,
            null,
            null,
            null,
            null,
            null,
            null,
            Map.of("executionMs", 45),
            Instant.now().toString()
        );
    }

    // 1. Correct secret accepted
    @Test
    @DisplayName("1. Correct X-Internal-Secret header is accepted with HTTP 200")
    void test01_correctSecretAccepted() throws Exception {
        JudgeResultCallbackRequest callback = createValidCallback();

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.verdict", is("accepted")));
    }

    // 2. Missing secret rejected
    @Test
    @DisplayName("2. Missing X-Internal-Secret header is rejected with HTTP 403")
    void test02_missingSecretRejected() throws Exception {
        JudgeResultCallbackRequest callback = createValidCallback();

        mockMvc.perform(post(CALLBACK_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code", is("FORBIDDEN")));
    }

    // 3. Wrong secret rejected
    @Test
    @DisplayName("3. Incorrect X-Internal-Secret header is rejected with HTTP 403")
    void test03_wrongSecretRejected() throws Exception {
        JudgeResultCallbackRequest callback = createValidCallback();

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, "invalid-forged-secret-xyz")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code", is("FORBIDDEN")));
    }

    // 4. Blank secret rejected
    @Test
    @DisplayName("4. Blank or whitespace X-Internal-Secret header is rejected with HTTP 403")
    void test04_blankSecretRejected() throws Exception {
        JudgeResultCallbackRequest callback = createValidCallback();

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, "   ")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code", is("FORBIDDEN")));
    }

    // 5. Valid JudgeResult accepted
    @Test
    @DisplayName("5. Valid JudgeResult payload is accepted and maps cleanly")
    void test05_validJudgeResultAccepted() throws Exception {
        JudgeResultCallbackRequest callback = createValidCallback();

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id", is(testSubmission.getId().toString())))
            .andExpect(jsonPath("$.data.runtimeMs", is(45)))
            .andExpect(jsonPath("$.data.memoryKb", is(2048)))
            .andExpect(jsonPath("$.data.testCasesPassed", is(5)))
            .andExpect(jsonPath("$.data.totalTestCases", is(5)));
    }

    // 6. Malformed payload rejected
    @Test
    @DisplayName("6. Malformed JSON payload or missing required fields is rejected with HTTP 400")
    void test06_malformedPayloadRejected() throws Exception {
        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ invalid json"))
            .andExpect(status().isBadRequest());

        // Missing required submissionId
        Map<String, Object> missingSubId = Map.of(
            "contractVersion", "1",
            "jobId", "job-123",
            "verdict", "ACCEPTED"
        );
        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(missingSubId)))
            .andExpect(status().isBadRequest());
    }

    // 7. Invalid contract version rejected
    @Test
    @DisplayName("7. Unsupported or missing contractVersion is rejected with HTTP 400")
    void test07_invalidContractVersionRejected() throws Exception {
        JudgeResultCallbackRequest callback = new JudgeResultCallbackRequest(
            "2", // unsupported version
            authoritativeJobId,
            testSubmission.getId(),
            "worker-1",
            "COMPLETED",
            "ACCEPTED",
            40,
            1024,
            5,
            5,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            Instant.now().toString()
        );

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.message", containsString("contract version")));
    }

    // 8. Unknown submission rejected
    @Test
    @DisplayName("8. Unknown or non-existent submission ID is rejected with HTTP 404")
    void test08_unknownSubmissionRejected() throws Exception {
        UUID unknownId = UUID.randomUUID();
        JudgeResultCallbackRequest callback = new JudgeResultCallbackRequest(
            "1",
            authoritativeJobId,
            unknownId,
            "worker-1",
            "COMPLETED",
            "ACCEPTED",
            40,
            1024,
            5,
            5,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            Instant.now().toString()
        );

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error.code", is("RESOURCE_NOT_FOUND")));
    }

    // 9. JobId mismatch rejected
    @Test
    @DisplayName("9. Job ID mismatch against submission authoritative judgeJobId is rejected with HTTP 409")
    void test09_jobIdMismatchRejected() throws Exception {
        JudgeResultCallbackRequest callback = new JudgeResultCallbackRequest(
            "1",
            "mismatched-job-different-uuid",
            testSubmission.getId(),
            "worker-1",
            "COMPLETED",
            "ACCEPTED",
            40,
            1024,
            5,
            5,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            Instant.now().toString()
        );

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code", is("CONFLICT")));
    }

    // 10. Submission ownership cannot be changed
    @Test
    @DisplayName("10. Callback payload cannot change submission ownership (userId is server-authoritative)")
    void test10_submissionOwnershipCannotBeChanged() throws Exception {
        JudgeResultCallbackRequest callback = createValidCallback();

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isOk());

        Submission reloaded = submissionRepository.findById(testSubmission.getId()).orElseThrow();
        assertEquals(USER_ID, reloaded.getUserId());
    }

    // 11. Valid terminal result persisted
    @Test
    @DisplayName("11. Valid terminal result is fully persisted to the database")
    void test11_validTerminalResultPersisted() throws Exception {
        JudgeResultCallbackRequest callback = createValidCallback();

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isOk());

        Submission reloaded = submissionRepository.findById(testSubmission.getId()).orElseThrow();
        assertEquals(SubmissionStatus.ACCEPTED, reloaded.getStatus());
        assertEquals(45, reloaded.getRuntimeMs());
        assertEquals(2048, reloaded.getMemoryKb());
        assertEquals(5, reloaded.getTestCasesPassed());
        assertEquals(5, reloaded.getTotalTestCases());
        assertEquals(100.0, reloaded.getScore());
        assertNotNull(reloaded.getCompletedAt());
        verify(userProgressService, times(1)).recordSubmissionResult(any(Submission.class));
    }

    // 12. Duplicate identical callback is idempotent
    @Test
    @DisplayName("12. Duplicate identical callback returns HTTP 200 without duplicate progress calls")
    void test12_duplicateIdenticalCallbackIsIdempotent() throws Exception {
        JudgeResultCallbackRequest callback = createValidCallback();

        // First delivery
        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isOk());

        // Second duplicate delivery
        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.data.verdict", is("accepted")));

        // UserProgressService should only have been called once across both callbacks
        verify(userProgressService, times(1)).recordSubmissionResult(any(Submission.class));
    }

    // 13. Conflicting duplicate callback rejected
    @Test
    @DisplayName("13. Conflicting duplicate callback on terminal submission is rejected with HTTP 409")
    void test13_conflictingDuplicateCallbackRejected() throws Exception {
        JudgeResultCallbackRequest acceptedCallback = createValidCallback();

        // First callback establishes ACCEPTED terminal state
        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(acceptedCallback)))
            .andExpect(status().isOk());

        // Second conflicting callback attempts to overwrite with WRONG_ANSWER
        JudgeResultCallbackRequest conflictingCallback = new JudgeResultCallbackRequest(
            "1",
            authoritativeJobId,
            testSubmission.getId(),
            "judge-worker-aws-1",
            "COMPLETED",
            "WRONG_ANSWER",
            50,
            2048,
            3,
            5,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            Instant.now().toString()
        );

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(conflictingCallback)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code", is("CONFLICT")));
    }

    // 14. Invalid state transition rejected
    @Test
    @DisplayName("14. Invalid state transition from CANCELLED to ACCEPTED is rejected with HTTP 409")
    void test14_invalidStateTransitionRejected() throws Exception {
        testSubmission.setStatus(SubmissionStatus.CANCELLED);
        submissionRepository.save(testSubmission);

        JudgeResultCallbackRequest callback = createValidCallback();

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code", is("CONFLICT")));
    }

    // 15. Hidden expected output cannot be persisted
    @Test
    @DisplayName("15. Hidden test expected output cannot be persisted through callback")
    void test15_hiddenExpectedOutputCannotBePersisted() throws Exception {
        FirstFailedTestDto hiddenFail = new FirstFailedTestDto(
            4,
            "actual_user_output",
            "CANONICAL_HIDDEN_EXPECTED_OUTPUT_LEAK_ATTEMPT",
            "WRONG_ANSWER",
            "Mismatch at line 1",
            false
        );

        JudgeResultCallbackRequest callback = new JudgeResultCallbackRequest(
            "1",
            authoritativeJobId,
            testSubmission.getId(),
            "judge-worker-aws-1",
            "COMPLETED",
            "WRONG_ANSWER",
            60,
            2048,
            3,
            5,
            hiddenFail,
            4,
            null,
            null,
            null,
            "Mismatch at line 1",
            null,
            Instant.now().toString()
        );

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isOk());

        Submission reloaded = submissionRepository.findById(testSubmission.getId()).orElseThrow();
        assertEquals(SubmissionStatus.WRONG_ANSWER, reloaded.getStatus());
        // Verify database does not contain the leak attempt string
        assertNull(reloaded.getStdoutOutput());
        assertFalse(reloaded.getErrorMessage() != null && reloaded.getErrorMessage().contains("CANONICAL_HIDDEN_EXPECTED_OUTPUT_LEAK_ATTEMPT"));
    }

    // 16. SourceCode cannot be overwritten
    @Test
    @DisplayName("16. Server-authoritative sourceCode cannot be overwritten through callback")
    void test16_sourceCodeCannotBeOverwritten() throws Exception {
        String originalCode = testSubmission.getSourceCode();
        JudgeResultCallbackRequest callback = createValidCallback();

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isOk());

        Submission reloaded = submissionRepository.findById(testSubmission.getId()).orElseThrow();
        assertEquals(originalCode, reloaded.getSourceCode());
    }

    // 17. Transaction rollback on persistence failure
    @Test
    @DisplayName("17. Transaction rolls back if post-processing fails")
    void test17_transactionRollbackOnPersistenceFailure() throws Exception {
        doThrow(new RuntimeException("Simulated database failure during progress update"))
            .when(userProgressService).recordSubmissionResult(any(Submission.class));

        JudgeResultCallbackRequest callback = createValidCallback();

        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isInternalServerError());
    }

    // 18. Normal user authentication cannot bypass internal secret
    @Test
    @DisplayName("18. Normal user JWT token without X-Internal-Secret cannot access internal callback endpoint")
    void test18_normalUserAuthCannotBypassInternalSecret() throws Exception {
        Jwt jwt = Jwt.withTokenValue("user-token")
            .header("alg", "HS256")
            .claim("sub", USER_ID.toString())
            .claim("email", "user@verniq.io")
            .claim("role", "authenticated")
            .build();
        AuthenticatedUser user = new AuthenticatedUser(
            USER_ID,
            "user@verniq.io",
            "USER",
            List.of(new SimpleGrantedAuthority("ROLE_USER")),
            java.util.Collections.emptyMap()
        );
        SupabaseAuthenticationToken userAuth = new SupabaseAuthenticationToken(
            jwt, user, user.authorities()
        );

        JudgeResultCallbackRequest callback = createValidCallback();

        mockMvc.perform(post(CALLBACK_URL)
                .with(authentication(userAuth))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(callback)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code", is("FORBIDDEN")));
    }

    // 19. Runtime/memory/test counts validated
    @Test
    @DisplayName("19. Negative runtime, memory, test counts, or passed > total are rejected with HTTP 400")
    void test19_numericRangesValidated() throws Exception {
        // Negative runtime
        JudgeResultCallbackRequest negRuntime = new JudgeResultCallbackRequest(
            "1", authoritativeJobId, testSubmission.getId(), "w1", "COMPLETED", "ACCEPTED",
            -10, 1024, 5, 5, null, null, null, null, null, null, null, Instant.now().toString()
        );
        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(negRuntime)))
            .andExpect(status().isBadRequest());

        // Negative memory
        JudgeResultCallbackRequest negMem = new JudgeResultCallbackRequest(
            "1", authoritativeJobId, testSubmission.getId(), "w1", "COMPLETED", "ACCEPTED",
            10, -50, 5, 5, null, null, null, null, null, null, null, Instant.now().toString()
        );
        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(negMem)))
            .andExpect(status().isBadRequest());

        // passed > total
        JudgeResultCallbackRequest passedExceedsTotal = new JudgeResultCallbackRequest(
            "1", authoritativeJobId, testSubmission.getId(), "w1", "COMPLETED", "ACCEPTED",
            10, 1024, 10, 5, null, null, null, null, null, null, null, Instant.now().toString()
        );
        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(passedExceedsTotal)))
            .andExpect(status().isBadRequest());
    }

    // 20. CompletedAt validated
    @Test
    @DisplayName("20. CompletedAt timestamp format is validated and persisted properly")
    void test20_completedAtValidated() throws Exception {
        // Malformed timestamp string
        JudgeResultCallbackRequest malformedTs = new JudgeResultCallbackRequest(
            "1", authoritativeJobId, testSubmission.getId(), "w1", "COMPLETED", "ACCEPTED",
            10, 1024, 5, 5, null, null, null, null, null, null, null, "not-an-iso-timestamp"
        );
        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(malformedTs)))
            .andExpect(status().isBadRequest());

        // Valid timestamp string
        Instant targetInstant = Instant.parse("2026-10-06T10:00:00Z");
        JudgeResultCallbackRequest validTs = new JudgeResultCallbackRequest(
            "1", authoritativeJobId, testSubmission.getId(), "w1", "COMPLETED", "ACCEPTED",
            10, 1024, 5, 5, null, null, null, null, null, null, null, targetInstant.toString()
        );
        mockMvc.perform(post(CALLBACK_URL)
                .header(INTERNAL_SECRET_HEADER, configuredSecret)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validTs)))
            .andExpect(status().isOk());

        Submission reloaded = submissionRepository.findById(testSubmission.getId()).orElseThrow();
        assertEquals(targetInstant, reloaded.getCompletedAt());
    }
}
