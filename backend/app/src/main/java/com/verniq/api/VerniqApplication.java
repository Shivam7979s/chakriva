package com.verniq.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Verniq Modular Monolith Application Entry Point.
 *
 * <p>Verniq follows a Modular Monolith architecture for the Application Plane,
 * decoupled from the untrusted Judge Execution Plane.</p>
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableScheduling
public class VerniqApplication {

    public static void main(String[] args) {
        SpringApplication.run(VerniqApplication.class, args);
    }
}
