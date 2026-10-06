package com.verniq.api.problems.repository;

import com.verniq.api.problems.domain.Company;
import com.verniq.api.problems.domain.Problem;
import com.verniq.api.problems.domain.ProblemDifficulty;
import com.verniq.api.problems.domain.Topic;
import com.verniq.api.problems.dto.ProblemFilterCriteria;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Dynamic JPA specifications for querying the Problem catalog.
 */
public final class ProblemSpecifications {

    private ProblemSpecifications() {}

    public static Specification<Problem> filterBy(ProblemFilterCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Rule: ONLY return published problems for catalog queries
            predicates.add(cb.or(
                cb.equal(cb.lower(root.get("workflowStatus").as(String.class)), "published"),
                cb.isTrue(root.get("isPublished"))
            ));

            if (criteria != null) {
                if (criteria.difficulty() != null) {
                    predicates.add(cb.equal(
                        cb.lower(root.get("difficulty").as(String.class)),
                        criteria.difficulty().name().toLowerCase(Locale.ROOT)
                    ));
                }

                if (StringUtils.hasText(criteria.topic())) {
                    Join<Problem, Topic> topicJoin = root.join("topics", JoinType.INNER);
                    String topicFilter = criteria.topic().trim().toLowerCase(Locale.ROOT);
                    predicates.add(cb.or(
                        cb.equal(cb.lower(topicJoin.get("slug")), topicFilter),
                        cb.equal(cb.lower(topicJoin.get("name")), topicFilter)
                    ));
                }

                if (StringUtils.hasText(criteria.company())) {
                    Join<Problem, Company> companyJoin = root.join("companies", JoinType.INNER);
                    String companyFilter = criteria.company().trim().toLowerCase(Locale.ROOT);
                    predicates.add(cb.or(
                        cb.equal(cb.lower(companyJoin.get("slug")), companyFilter),
                        cb.equal(cb.lower(companyJoin.get("name")), companyFilter)
                    ));
                }

                if (StringUtils.hasText(criteria.search())) {
                    String pattern = "%" + criteria.search().trim().toLowerCase(Locale.ROOT) + "%";
                    predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("verniqId")), pattern)
                    ));
                }
            }

            // Ensure distinct when joining collections
            if (query != null) {
                query.distinct(true);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
