package com.verniq.api.roadmaps.repository;

import com.verniq.api.roadmaps.domain.UserRoadmapItemProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRoadmapItemProgressRepository extends JpaRepository<UserRoadmapItemProgress, UUID> {

    List<UserRoadmapItemProgress> findByUserIdAndRoadmapItemIdIn(UUID userId, Collection<UUID> roadmapItemIds);

    Optional<UserRoadmapItemProgress> findByUserIdAndRoadmapItemId(UUID userId, UUID roadmapItemId);

    List<UserRoadmapItemProgress> findByUserId(UUID userId);
}
