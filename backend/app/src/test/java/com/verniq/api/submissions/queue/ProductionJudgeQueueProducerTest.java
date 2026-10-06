package com.verniq.api.submissions.queue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.verniq.api.common.exception.InvalidRequestException;
import com.verniq.api.common.exception.ServiceUnavailableException;
import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.submissions.domain.Submission;
import com.verniq.api.submissions.dto.CreateSubmissionRequest;
import com.verniq.api.submissions.dto.SubmissionResponseDto;
import com.verniq.api.submissions.metrics.SubmissionMetrics;
import com.verniq.api.submissions.repository.SubmissionRepository;
import com.verniq.api.submissions.service.SubmissionRateLimiter;
import com.verniq.api.submissions.service.SubmissionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit test suite for Phase J.5.2 Production Judge Queue Producer & Publication Pipeline.
 */
class ProductionJudgeQueueProducerTest {

    private StringRedisTemplate redisTemplate;
    private ListOperations<String, String> listOps;
    private ObjectMapper objectMapper;
    private SubmissionQueueProducer queueProducer;

    private SubmissionRepository submissionRepository;
    private ProblemRepository problemRepository;
    private com.verniq.api.progress.service.UserProgressService userProgressService;
    private SubmissionRateLimiter rateLimiter;
    private SubmissionMetrics submissionMetrics;
    private SubmissionService submissionService;

    private Problem publishedProblem;
    private Problem draftProblem;
    private UUID testUserId;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        listOps = mock(ListOperations.class);
        when(redisTemplate.opsForList()).thenReturn(listOps);

        objectMapper = new ObjectMapper();
        queueProducer = new SubmissionQueueProducer(redisTemplate, null, objectMapper, "verniq:submissions:queue");

        submissionRepository = mock(SubmissionRepository.class);
        problemRepository = mock(ProblemRepository.class);
        userProgressService = mock(com.verniq.api.progress.service.UserProgressService.class);
        rateLimiter = mock(SubmissionRateLimiter.class);
        submissionMetrics = mock(SubmissionMetrics.class);

        submissionService = new SubmissionService(
            submissionRepository,
            problemRepository,
            queueProducer,
            userProgressService,
            rateLimiter,
            submissionMetrics
        );

        testUserId = UUID.randomUUID();

        publishedProblem = new Problem();
        publishedProblem.setId(UUID.randomUUID());
        publishedProblem.setVerniqId("VRQ-000001");
        publishedProblem.setSlug("two-sum");
        publishedProblem.setTitle("Two Sum");
        publishedProblem.setPublished(true);
        publishedProblem.setCurrentVersion(3);

        draftProblem = new Problem();
        draftProblem.setId(UUID.randomUUID());
        draftProblem.setVerniqId("VRQ-000002");
        draftProblem.setSlug("add-two-numbers");
        draftProblem.setTitle("Add Two Numbers");
        draftProblem.setPublished(false);
        draftProblem.setCurrentVersion(1);

        when(problemRepository.findByVerniqId("VRQ-000001")).thenReturn(Optional.of(publishedProblem));
        when(problemRepository.findBySlug("two-sum")).thenReturn(Optional.of(publishedProblem));
        when(problemRepository.findByVerniqId("VRQ-000002")).thenReturn(Optional.of(draftProblem));

        when(submissionRepository.save(any(Submission.class))).thenAnswer(invocation -> {
            Submission s = invocation.getArgument(0);
            if (s.getId() == null) {
                s.setId(UUID.randomUUID());
            }
            return s;
        });
    }

    @Test
    @DisplayName("1. Valid SUBMIT creates and enqueues correct JudgeJob adhering to J.5.1")
    void validSubmitCreatesCorrectJudgeJob() throws Exception {
        CreateSubmissionRequest request = new CreateSubmissionRequest(
            "VRQ-000001",
            "java",
            "class Solution { public int solve() { return 1; } }",
            "SUBMIT",
            null
        );

        SubmissionResponseDto response = submissionService.createSubmission(testUserId, request);
        assertNotNull(response);
        assertEquals("VRQ-000001", response.problemId());

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(listOps).rightPush(eq("verniq:submissions:queue"), payloadCaptor.capture());

        String json = payloadCaptor.getValue();
        JsonNode node = objectMapper.readTree(json);

        assertEquals("1", node.get("contractVersion").asText());
        assertEquals("SUBMIT", node.get("mode").asText());
        assertEquals("VRQ-000001", node.get("problemVerniqId").asText());
        assertEquals(publishedProblem.getId().toString(), node.get("problemId").asText());
        assertEquals(3, node.get("problemVersion").asInt());
        assertEquals("java", node.get("language").asText());
        assertEquals("class Solution { public int solve() { return 1; } }", node.get("sourceCode").asText());
        assertNotNull(node.get("jobId").asText());
        assertNotNull(node.get("submissionId").asText());
        assertNotNull(node.get("createdAt").asText());
    }

    @Test
    @DisplayName("2. Valid RUN creates correct JudgeJob with customInput")
    void validRunCreatesCorrectJudgeJob() throws Exception {
        CreateSubmissionRequest request = new CreateSubmissionRequest(
            "two-sum",
            "python",
            "print('test')",
            "RUN",
            "[1, 2, 3]\n"
        );

        SubmissionResponseDto response = submissionService.createSubmission(testUserId, request);
        assertNotNull(response);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(listOps).rightPush(eq("verniq:submissions:queue"), payloadCaptor.capture());

        JsonNode node = objectMapper.readTree(payloadCaptor.getValue());
        assertEquals("1", node.get("contractVersion").asText());
        assertEquals("RUN", node.get("mode").asText());
        assertEquals("[1, 2, 3]\n", node.get("customInput").asText());
        assertEquals("python", node.get("language").asText());
    }

    @Test
    @DisplayName("3 & 4. Server-authoritative time and memory limits enforced")
    void serverAuthoritativeLimitsEnforced() throws Exception {
        CreateSubmissionRequest request = new CreateSubmissionRequest(
            "VRQ-000001", "cpp", "int main(){ return 0; }"
        );

        submissionService.createSubmission(testUserId, request);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(listOps).rightPush(any(), payloadCaptor.capture());

        JsonNode node = objectMapper.readTree(payloadCaptor.getValue());
        assertEquals(2000, node.get("timeLimitMs").asInt());
        assertEquals(256, node.get("memoryLimitMb").asInt());
    }

    @Test
    @DisplayName("5. Server-authoritative problem version enforced")
    void serverAuthoritativeProblemVersionEnforced() throws Exception {
        CreateSubmissionRequest request = new CreateSubmissionRequest(
            "VRQ-000001", "go", "package main"
        );

        submissionService.createSubmission(testUserId, request);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(listOps).rightPush(any(), payloadCaptor.capture());

        JsonNode node = objectMapper.readTree(payloadCaptor.getValue());
        assertEquals(publishedProblem.getCurrentVersion(), node.get("problemVersion").asInt());
    }

    @Test
    @DisplayName("6. Unpublished problem is rejected")
    void unpublishedProblemRejected() {
        CreateSubmissionRequest request = new CreateSubmissionRequest(
            "VRQ-000002", "java", "class Solution {}"
        );

        InvalidRequestException ex = assertThrows(InvalidRequestException.class, () -> {
            submissionService.createSubmission(testUserId, request);
        });

        assertTrue(ex.getMessage().toUpperCase().contains("PUBLISHED"));
        verifyNoInteractions(listOps);
    }

    @Test
    @DisplayName("7. Unauthenticated request rejected")
    void unauthenticatedRequestRejected() {
        CreateSubmissionRequest request = new CreateSubmissionRequest(
            "VRQ-000001", "java", "class Solution {}"
        );

        assertThrows(InvalidRequestException.class, () -> {
            submissionService.createSubmission(null, request);
        });
        verifyNoInteractions(listOps);
    }

    @Test
    @DisplayName("8. Invalid language rejected")
    void invalidLanguageRejected() {
        CreateSubmissionRequest request = new CreateSubmissionRequest(
            "VRQ-000001", "brainfuck", "+++"
        );

        assertThrows(IllegalArgumentException.class, () -> {
            submissionService.createSubmission(testUserId, request);
        });
        verifyNoInteractions(listOps);
    }

    @Test
    @DisplayName("9. Invalid mode rejected")
    void invalidModeRejected() {
        CreateSubmissionRequest request = new CreateSubmissionRequest(
            "VRQ-000001", "java", "class S{}", "BENCHMARK", null
        );

        InvalidRequestException ex = assertThrows(InvalidRequestException.class, () -> {
            submissionService.createSubmission(testUserId, request);
        });
        assertTrue(ex.getMessage().contains("Invalid execution mode"));
        verifyNoInteractions(listOps);
    }

    @Test
    @DisplayName("10 & 11. JudgeJob serialized as valid JSON and pushed to designated queue")
    void serializationAndQueuePush() throws Exception {
        JudgeJobPayload payload = JudgeJobPayload.of(
            "job-uuid-1", "sub-uuid-1", "prob-uuid-1", "VRQ-000001", 1,
            "java", "class Solution{}", "SUBMIT", 2000, 256, null
        );

        queueProducer.enqueue(payload);

        verify(listOps).rightPush(eq("verniq:submissions:queue"), any(String.class));
        assertEquals("verniq:submissions:queue", queueProducer.getQueueName());
    }

    @Test
    @DisplayName("12. Queue payload contains explicit contractVersion '1'")
    void queuePayloadContainsContractVersion1() throws Exception {
        CreateSubmissionRequest request = new CreateSubmissionRequest("VRQ-000001", "java", "class S{}");
        submissionService.createSubmission(testUserId, request);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(listOps).rightPush(any(), payloadCaptor.capture());

        JsonNode node = objectMapper.readTree(payloadCaptor.getValue());
        assertEquals("1", node.get("contractVersion").asText());
    }

    @Test
    @DisplayName("13 & 14. Queue payload contains zero test cases and zero secrets")
    void payloadContainsNoTestCasesOrSecrets() throws Exception {
        CreateSubmissionRequest request = new CreateSubmissionRequest("VRQ-000001", "java", "class S{}");
        submissionService.createSubmission(testUserId, request);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(listOps).rightPush(any(), payloadCaptor.capture());

        String json = payloadCaptor.getValue();
        JsonNode node = objectMapper.readTree(json);

        assertNull(node.get("testCases"));
        assertNull(node.get("canonicalTests"));
        assertNull(node.get("expectedOutput"));
        assertNull(node.get("secret"));
        assertNull(node.get("serviceRoleKey"));
        assertNull(node.get("token"));
        assertNull(node.get("password"));
    }

    @Test
    @DisplayName("15. Redis failure throws controlled ServiceUnavailableException")
    void redisFailureThrowsServiceUnavailable() {
        when(listOps.rightPush(any(), any())).thenThrow(new RuntimeException("Redis connection timed out"));

        CreateSubmissionRequest request = new CreateSubmissionRequest("VRQ-000001", "java", "class S{}");

        ServiceUnavailableException ex = assertThrows(ServiceUnavailableException.class, () -> {
            submissionService.createSubmission(testUserId, request);
        });

        assertTrue(ex.getMessage().contains("unreachable"));
    }

    @Test
    @DisplayName("16. Source code is redacted in JudgeJobPayload toString")
    void sourceCodeRedactedInToString() {
        JudgeJobPayload payload = JudgeJobPayload.of(
            "job-uuid-1", "sub-uuid-1", "prob-uuid-1", "VRQ-000001", 1,
            "java", "PROPRIETARY_UNRELEASED_SOURCE_CODE = 42;", "SUBMIT", 2000, 256, null
        );

        String str = payload.toString();
        assertFalse(str.contains("PROPRIETARY_UNRELEASED_SOURCE_CODE"));
        assertTrue(str.contains("<REDACTED len="));
    }

    @Test
    @DisplayName("17. Same jobId is reused during publication retry")
    void sameJobIdReusedDuringRetry() throws Exception {
        UUID subId = UUID.randomUUID();
        Submission existingSub = new Submission();
        existingSub.setId(subId);
        existingSub.setUserId(testUserId);
        existingSub.setProblem(publishedProblem);
        existingSub.setProblemVersion(publishedProblem.getCurrentVersion());
        existingSub.setLanguage("java");
        existingSub.setSourceCode("class S{}");
        String originalJobId = "job_fixed_idempotent_12345";
        existingSub.setJudgeJobId(originalJobId);

        when(submissionRepository.findById(subId)).thenReturn(Optional.of(existingSub));

        submissionService.republishSubmission(subId);

        ArgumentCaptor<String> payloadCaptor = ArgumentCaptor.forClass(String.class);
        verify(listOps).rightPush(eq("verniq:submissions:queue"), payloadCaptor.capture());

        JsonNode node = objectMapper.readTree(payloadCaptor.getValue());
        assertEquals(originalJobId, node.get("jobId").asText());
    }
}
