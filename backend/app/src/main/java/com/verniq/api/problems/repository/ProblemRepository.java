package com.verniq.api.problems.repository;

import com.verniq.api.problems.domain.Problem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProblemRepository extends JpaRepository<Problem, UUID>, JpaSpecificationExecutor<Problem> {

    @EntityGraph(attributePaths = {"topics", "companies"})
    Optional<Problem> findByVerniqId(String verniqId);

    @EntityGraph(attributePaths = {"topics", "companies"})
    Optional<Problem> findBySlug(String slug);

    @EntityGraph(attributePaths = {"topics", "companies"})
    Optional<Problem> findByVerniqIdAndWorkflowStatus(String verniqId, String workflowStatus);

    @EntityGraph(attributePaths = {"topics", "companies"})
    Optional<Problem> findBySlugAndWorkflowStatus(String slug, String workflowStatus);

    @EntityGraph(attributePaths = {"topics", "companies"})
    java.util.List<Problem> findByVerniqIdIn(java.util.Collection<String> verniqIds);

    @Override
    @EntityGraph(attributePaths = {"topics", "companies"})
    Page<Problem> findAll(Specification<Problem> spec, Pageable pageable);
}
