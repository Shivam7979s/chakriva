package com.verniq.api.roadmaps.repository;

import com.verniq.api.roadmaps.domain.UserRoadmapProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRoadmapProgressRepository extends JpaRepository<UserRoadmapProgress, UUID> {

    Optional<UserRoadmapProgress> findByUserIdAndRoadmapId(UUID userId, UUID roadmapId);
}
