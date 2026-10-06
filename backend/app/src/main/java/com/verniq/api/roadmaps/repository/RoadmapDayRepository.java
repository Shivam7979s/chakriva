package com.verniq.api.roadmaps.repository;

import com.verniq.api.roadmaps.domain.RoadmapDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface RoadmapDayRepository extends JpaRepository<RoadmapDay, UUID> {

    List<RoadmapDay> findBySprintIdOrderByPositionAsc(UUID sprintId);

    List<RoadmapDay> findBySprintIdInOrderByPositionAsc(Collection<UUID> sprintIds);
}
