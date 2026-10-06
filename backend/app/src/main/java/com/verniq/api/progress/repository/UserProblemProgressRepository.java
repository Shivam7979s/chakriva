package com.verniq.api.progress.repository;

import com.verniq.api.progress.domain.UserProblemProgress;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserProblemProgressRepository extends JpaRepository<UserProblemProgress, UUID> {

    Optional<UserProblemProgress> findByUserIdAndProblemId(UUID userId, UUID problemId);

    List<UserProblemProgress> findByUserId(UUID userId);

    List<UserProblemProgress> findByUserIdAndStatus(UUID userId, String status);

    @Query("SELECT upp FROM UserProblemProgress upp JOIN FETCH upp.problem p WHERE upp.userId = :userId AND upp.lastAttemptedAt IS NOT NULL ORDER BY upp.lastAttemptedAt DESC")
    List<UserProblemProgress> findRecentActivityForUser(@Param("userId") UUID userId, Pageable pageable);

    @Query(value = "SELECT LOWER(p.difficulty) AS diff, COUNT(p.id) AS total " +
                   "FROM problems p WHERE p.is_published = true " +
                   "GROUP BY LOWER(p.difficulty)", nativeQuery = true)
    List<Object[]> countPublishedProblemsByDifficulty();

    @Query(value = "SELECT LOWER(p.difficulty) AS diff, " +
                   "COUNT(CASE WHEN upp.status = 'solved' THEN 1 END) AS solved_count, " +
                   "COUNT(CASE WHEN upp.status IN ('solved', 'attempted') THEN 1 END) AS attempted_count " +
                   "FROM user_problem_progress upp " +
                   "JOIN problems p ON upp.problem_id = p.id " +
                   "WHERE upp.user_id = :userId AND p.is_published = true " +
                   "GROUP BY LOWER(p.difficulty)", nativeQuery = true)
    List<Object[]> countUserProgressByDifficulty(@Param("userId") UUID userId);

    @Query(value = "SELECT t.slug, t.name, " +
                   "COUNT(DISTINCT pt.problem_id) AS total_problems, " +
                   "COUNT(DISTINCT CASE WHEN upp.status = 'solved' THEN upp.problem_id END) AS solved_problems, " +
                   "COUNT(DISTINCT CASE WHEN upp.status IN ('solved', 'attempted') THEN upp.problem_id END) AS attempted_problems " +
                   "FROM topics t " +
                   "JOIN problem_topics pt ON pt.topic_id = t.id " +
                   "JOIN problems p ON p.id = pt.problem_id AND p.is_published = true " +
                   "LEFT JOIN user_problem_progress upp ON upp.problem_id = p.id AND upp.user_id = :userId " +
                   "GROUP BY t.id, t.slug, t.name " +
                   "ORDER BY t.name ASC", nativeQuery = true)
    List<Object[]> aggregateTopicProgressForUser(@Param("userId") UUID userId);

    @Query(value = "SELECT c.slug, c.name, " +
                   "COUNT(DISTINCT pc.problem_id) AS total_problems, " +
                   "COUNT(DISTINCT CASE WHEN upp.status = 'solved' THEN upp.problem_id END) AS solved_problems, " +
                   "COUNT(DISTINCT CASE WHEN upp.status IN ('solved', 'attempted') THEN upp.problem_id END) AS attempted_problems " +
                   "FROM companies c " +
                   "JOIN problem_companies pc ON pc.company_id = c.id " +
                   "JOIN problems p ON p.id = pc.problem_id AND p.is_published = true " +
                   "LEFT JOIN user_problem_progress upp ON upp.problem_id = p.id AND upp.user_id = :userId " +
                   "GROUP BY c.id, c.slug, c.name " +
                   "ORDER BY total_problems DESC, c.name ASC", nativeQuery = true)
    List<Object[]> aggregateCompanyProgressForUser(@Param("userId") UUID userId);

    @Query(value = "SELECT COUNT(s.id) AS total_submissions, " +
                   "COUNT(CASE WHEN s.verdict = 'accepted' THEN 1 END) AS accepted_submissions " +
                   "FROM submissions s " +
                   "WHERE s.user_id = :userId AND s.is_custom_run = false", nativeQuery = true)
    List<Object[]> countSubmissionStatsForUser(@Param("userId") UUID userId);

    @Query(value = "SELECT " +
                   "COUNT(CASE WHEN upp.status = 'solved' THEN 1 END) AS total_solved, " +
                   "COUNT(CASE WHEN upp.status IN ('solved', 'attempted') THEN 1 END) AS total_attempted " +
                   "FROM user_problem_progress upp " +
                   "JOIN problems p ON upp.problem_id = p.id AND p.is_published = true " +
                   "WHERE upp.user_id = :userId", nativeQuery = true)
    List<Object[]> countProblemProgressTotalsForUser(@Param("userId") UUID userId);

    @Query("SELECT COUNT(upp.id) FROM UserProblemProgress upp WHERE upp.userId = :userId AND upp.status = 'solved' AND upp.firstSolvedAt >= :cutoff")
    long countSolvedSince(@Param("userId") UUID userId, @Param("cutoff") java.time.Instant cutoff);

    @Query("SELECT upp.firstSolvedAt FROM UserProblemProgress upp WHERE upp.userId = :userId AND upp.status = 'solved' AND upp.firstSolvedAt >= :startDate ORDER BY upp.firstSolvedAt ASC")
    List<java.time.Instant> findSolvedTimestampsSince(@Param("userId") UUID userId, @Param("startDate") java.time.Instant startDate);
}
