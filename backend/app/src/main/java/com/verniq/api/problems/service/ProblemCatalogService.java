package com.verniq.api.problems.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.verniq.api.common.exception.InvalidRequestException;
import com.verniq.api.common.exception.ResourceNotFoundException;
import com.verniq.api.problems.domain.Company;
import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.domain.TestCase;
import com.verniq.api.problems.domain.Topic;
import com.verniq.api.problems.dto.*;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.problems.repository.ProblemSpecifications;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Service orchestrating public catalog browsing and problem inspection.
 *
 * <p>Enforces publication visibility rules and strictly filters out all
 * private/hidden canonical test suites, reference solutions, and judge configs.</p>
 */
@Service
@Transactional(readOnly = true)
public class ProblemCatalogService {

    private static final Logger log = LoggerFactory.getLogger(ProblemCatalogService.class);
    private static final Pattern VERNIQ_ID_PATTERN = Pattern.compile("^VRQ-[0-9]{4,8}$", Pattern.CASE_INSENSITIVE);
    private static final int MAX_PAGE_SIZE = 100;
    private static final int DEFAULT_PAGE_SIZE = 20;

    private final ProblemRepository problemRepository;
    private final ObjectMapper objectMapper;

    public ProblemCatalogService(ProblemRepository problemRepository, ObjectMapper objectMapper) {
        this.problemRepository = problemRepository;
        this.objectMapper = objectMapper;
    }

    public PageResponse<ProblemSummaryDto> listPublishedProblems(ProblemFilterCriteria criteria, int page, int size) {
        int validatedPage = Math.max(0, page);
        int validatedSize = (size <= 0) ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);

        Pageable pageable = PageRequest.of(validatedPage, validatedSize, Sort.by("verniqId").ascending());
        Page<Problem> problemsPage = problemRepository.findAll(ProblemSpecifications.filterBy(criteria), pageable);

        Page<ProblemSummaryDto> dtoPage = problemsPage.map(this::toSummaryDto);
        return PageResponse.of(dtoPage);
    }

    public ProblemDetailDto getPublishedProblem(String identifier) {
        if (!StringUtils.hasText(identifier)) {
            throw new InvalidRequestException("Problem identifier cannot be empty");
        }

        String trimmed = identifier.trim();
        Optional<Problem> optionalProblem;

        if (VERNIQ_ID_PATTERN.matcher(trimmed).matches()) {
            optionalProblem = problemRepository.findByVerniqId(trimmed.toUpperCase(Locale.ROOT));
        } else {
            optionalProblem = problemRepository.findBySlug(trimmed.toLowerCase(Locale.ROOT));
        }

        Problem problem = optionalProblem.orElseThrow(() -> new ResourceNotFoundException("Problem", identifier));

        // Rule: Only published problems are visible via public catalog endpoints
        if (!problem.isPublished()) {
            log.info("Access denied for unpublished problem {} (status: {})", problem.getVerniqId(), problem.getRawWorkflowStatus());
            throw new ResourceNotFoundException("Problem", identifier);
        }

        return toDetailDto(problem);
    }

    private ProblemSummaryDto toSummaryDto(Problem problem) {
        List<String> topicNames = problem.getTopics().stream()
            .map(Topic::getName)
            .sorted()
            .toList();

        List<String> companyNames = problem.getCompanies().stream()
            .map(Company::getName)
            .sorted()
            .toList();

        return new ProblemSummaryDto(
            problem.getVerniqId(),
            problem.getTitle(),
            problem.getSlug(),
            problem.getDifficulty(),
            problem.getAcceptanceRate(),
            topicNames,
            companyNames
        );
    }

    private ProblemDetailDto toDetailDto(Problem problem) {
        List<String> topicNames = problem.getTopics().stream()
            .map(Topic::getName)
            .sorted()
            .toList();

        List<String> companyNames = problem.getCompanies().stream()
            .map(Company::getName)
            .sorted()
            .toList();

        // Security boundary: Extract ONLY test cases marked as sample (isSample = true).
        // Canonical hidden tests (isSample = false) are NEVER exposed!
        List<ExampleDto> sampleExamples = problem.getTestCases().stream()
            .filter(TestCase::isSample)
            .sorted(Comparator.comparingInt(TestCase::getOrderIndex))
            .map(tc -> new ExampleDto(tc.getInput(), tc.getExpectedOutput(), null))
            .toList();

        Map<String, String> templatesMap = parseStarterTemplates(problem.getStarterTemplates());

        return new ProblemDetailDto(
            problem.getVerniqId(),
            problem.getTitle(),
            problem.getSlug(),
            problem.getDifficulty(),
            problem.getAcceptanceRate(),
            problem.getDescriptionMarkdown(),
            problem.getConstraintsMarkdown(),
            sampleExamples,
            templatesMap,
            topicNames,
            companyNames,
            problem.getCurrentVersion(),
            problem.getPublishedAt()
        );
    }

    private Map<String, String> parseStarterTemplates(String templatesJson) {
        if (!StringUtils.hasText(templatesJson)) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(templatesJson, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse starter templates JSON: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }
}
