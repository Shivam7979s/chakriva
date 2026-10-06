package com.verniq.api.roadmaps.repository;

import com.verniq.api.roadmaps.domain.Roadmap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoadmapRepository extends JpaRepository<Roadmap, UUID> {

    Optional<Roadmap> findBySlugAndIsPublishedTrue(String slug);

    Optional<Roadmap> findByIdAndIsPublishedTrue(UUID id);

    List<Roadmap> findAllByIsPublishedTrueOrderByOrderIndexAsc();
}
