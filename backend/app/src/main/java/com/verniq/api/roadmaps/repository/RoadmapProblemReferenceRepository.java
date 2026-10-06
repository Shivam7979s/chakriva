package com.verniq.api.roadmaps.repository;

import com.verniq.api.roadmaps.domain.RoadmapProblemReference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoadmapProblemReferenceRepository extends JpaRepository<RoadmapProblemReference, UUID> {

    List<RoadmapProblemReference> findByRoadmapItemIdOrderByPositionAsc(UUID roadmapItemId);

    List<RoadmapProblemReference> findByRoadmapItemIdInOrderByPositionAsc(Collection<UUID> roadmapItemIds);

    Optional<RoadmapProblemReference> findByRoadmapItemId(UUID roadmapItemId);
}
