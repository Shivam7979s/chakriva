package com.verniq.api.problems;

import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.domain.ProblemDifficulty;
import com.verniq.api.problems.domain.ProblemLifecycleStatus;
import com.verniq.api.problems.domain.Topic;
import com.verniq.api.problems.dto.ProblemFilterCriteria;
import com.verniq.api.problems.repository.ProblemRepository;
import com.verniq.api.problems.repository.ProblemSpecifications;
import com.verniq.api.problems.repository.TopicRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ProblemRepositoryTest {

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private TopicRepository topicRepository;

    @BeforeEach
    void setUp() {
        problemRepository.deleteAll();
        topicRepository.deleteAll();

        Topic mathTopic = topicRepository.save(new Topic(UUID.randomUUID(), "Math", "math"));

        Problem problem = new Problem();
        problem.setVerniqId("VRQ-000019");
        problem.setTitle("Remove Nth Node From End of List");
        problem.setSlug("remove-nth-node-from-end-of-list");
        problem.setDifficulty(ProblemDifficulty.MEDIUM);
        problem.setLifecycleStatus(ProblemLifecycleStatus.PUBLISHED);
        problem.setTopics(Set.of(mathTopic));

        problemRepository.save(problem);
    }

    @Test
    @DisplayName("findByVerniqId returns the problem when identifier exists")
    void testFindByVerniqId() {
        Optional<Problem> found = problemRepository.findByVerniqId("VRQ-000019");
        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("Remove Nth Node From End of List");
        assertThat(found.get().getDifficulty()).isEqualTo(ProblemDifficulty.MEDIUM);
    }

    @Test
    @DisplayName("findBySlug returns the problem when slug exists")
    void testFindBySlug() {
        Optional<Problem> found = problemRepository.findBySlug("remove-nth-node-from-end-of-list");
        assertThat(found).isPresent();
        assertThat(found.get().getVerniqId()).isEqualTo("VRQ-000019");
    }

    @Test
    @DisplayName("Specification filters correctly by topic and difficulty")
    void testSpecificationFiltering() {
        ProblemFilterCriteria criteria = new ProblemFilterCriteria(ProblemDifficulty.MEDIUM, "math", null, null);
        Page<Problem> page = problemRepository.findAll(ProblemSpecifications.filterBy(criteria), PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getVerniqId()).isEqualTo("VRQ-000019");
    }
}
