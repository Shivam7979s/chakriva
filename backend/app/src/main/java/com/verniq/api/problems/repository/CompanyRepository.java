package com.verniq.api.problems.repository;

import com.verniq.api.problems.domain.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {
    Optional<Company> findBySlug(String slug);
    Optional<Company> findByNameIgnoreCase(String name);
}
