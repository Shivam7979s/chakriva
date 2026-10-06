package com.verniq.api.health.indicator;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

@Component
public class DatabaseReadinessIndicator {

    private static final Logger log = LoggerFactory.getLogger(DatabaseReadinessIndicator.class);
    private final DataSource dataSource;

    public DatabaseReadinessIndicator(@Autowired(required = false) DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public boolean isReady() {
        if (dataSource == null) {
            return false;
        }
        try (Connection conn = dataSource.getConnection()) {
            return conn.isValid(2);
        } catch (Exception e) {
            log.warn("Database readiness check failed: {}", e.getMessage());
            return false;
        }
    }
}
