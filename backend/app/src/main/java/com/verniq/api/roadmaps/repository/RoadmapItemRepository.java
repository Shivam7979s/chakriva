package com.verniq.api.roadmaps.repository;

import com.verniq.api.roadmaps.domain.RoadmapItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface RoadmapItemRepository extends JpaRepository<RoadmapItem, UUID> {

    List<RoadmapItem> findByDayIdOrderByPositionAsc(UUID dayId);

    List<RoadmapItem> findByDayIdInOrderByPositionAsc(Collection<UUID> dayIds);
}
