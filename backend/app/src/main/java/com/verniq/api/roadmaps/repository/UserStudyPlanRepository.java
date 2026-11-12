package com.verniq.api.roadmaps.repository;

import com.verniq.api.roadmaps.domain.UserStudyPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserStudyPlanRepository extends JpaRepository<UserStudyPlan, UUID> {

    Optional<UserStudyPlan> findByUserIdAndIsActiveTrue(UUID userId);

    Optional<UserStudyPlan> findByIdAndUserId(UUID id, UUID userId);

    List<UserStudyPlan> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    List<UserStudyPlan> findAllByUserIdOrderByUpdatedAtDesc(UUID userId);

    boolean existsByUserIdAndIsActiveTrue(UUID userId);
}
