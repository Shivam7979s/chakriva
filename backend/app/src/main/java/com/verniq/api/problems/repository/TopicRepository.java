package com.verniq.api.problems.repository;

import com.verniq.api.problems.domain.Topic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TopicRepository extends JpaRepository<Topic, UUID> {
    Optional<Topic> findBySlug(String slug);
    Optional<Topic> findByNameIgnoreCase(String name);
}
