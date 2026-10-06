package com.verniq.api.roadmaps.repository;

import com.verniq.api.roadmaps.domain.RoadmapDayTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface RoadmapDayTopicRepository extends JpaRepository<RoadmapDayTopic, UUID> {

    List<RoadmapDayTopic> findByDayIdOrderByPositionAsc(UUID dayId);

    List<RoadmapDayTopic> findByDayIdInOrderByPositionAsc(Collection<UUID> dayIds);
}
