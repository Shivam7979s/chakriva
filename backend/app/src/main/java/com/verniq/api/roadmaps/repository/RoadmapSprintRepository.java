package com.verniq.api.roadmaps.repository;

import com.verniq.api.roadmaps.domain.RoadmapSprint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoadmapSprintRepository extends JpaRepository<RoadmapSprint, UUID> {

    List<RoadmapSprint> findByRoadmapIdAndIsPublishedTrueOrderByPositionAsc(UUID roadmapId);
}
