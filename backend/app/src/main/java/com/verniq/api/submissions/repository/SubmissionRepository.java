package com.verniq.api.submissions.repository;

import com.verniq.api.submissions.domain.Submission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {

    @EntityGraph(attributePaths = {"problem"})
    Optional<Submission> findByIdAndUserId(UUID id, UUID userId);

    @EntityGraph(attributePaths = {"problem"})
    Optional<Submission> findByJudgeJobId(String judgeJobId);

    @EntityGraph(attributePaths = {"problem"})
    Page<Submission> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @EntityGraph(attributePaths = {"problem"})
    Page<Submission> findByUserIdAndProblemIdOrderByCreatedAtDesc(UUID userId, UUID problemId, Pageable pageable);

    @EntityGraph(attributePaths = {"problem"})
    @Query("SELECT s FROM Submission s WHERE CAST(s.verdict AS string) IN :verdicts AND s.createdAt < :cutoff")
    List<Submission> findStaleSubmissions(@Param("verdicts") Collection<String> verdicts, @Param("cutoff") Instant cutoff);

    @Query("SELECT LOWER(s.verdict) AS verdict, COUNT(s.id) AS cnt FROM Submission s WHERE s.userId = :userId AND s.isCustomRun = false GROUP BY LOWER(s.verdict)")
    List<Object[]> countVerdictDistributionForUser(@Param("userId") UUID userId);

    @Query("SELECT COUNT(s.id) FROM Submission s WHERE s.userId = :userId AND s.isCustomRun = false AND s.createdAt >= :cutoff")
    long countSubmissionsSince(@Param("userId") UUID userId, @Param("cutoff") Instant cutoff);

    @Query("SELECT s.createdAt, LOWER(s.verdict) FROM Submission s WHERE s.userId = :userId AND s.isCustomRun = false AND s.createdAt >= :startDate ORDER BY s.createdAt ASC")
    List<Object[]> findSubmissionsSince(@Param("userId") UUID userId, @Param("startDate") Instant startDate);
}
