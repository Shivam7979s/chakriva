package com.verniq.api.submissions.metrics;

import com.verniq.api.submissions.queue.SubmissionQueueProducer;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Micrometer metrics for submission pipeline, judge execution, and queue health.
 * Strictly adheres to low-cardinality label rules (no user IDs, request IDs, or code).
 */
@Component
public class SubmissionMetrics {

    private final MeterRegistry meterRegistry;
    private final SubmissionQueueProducer queueProducer;

    public SubmissionMetrics(@Autowired(required = false) MeterRegistry meterRegistry,
                             SubmissionQueueProducer queueProducer) {
        this.meterRegistry = meterRegistry;
        this.queueProducer = queueProducer;

        if (this.meterRegistry != null) {
            // Register queue depth gauge
            this.meterRegistry.gauge("verniq.judge.queue.depth", this.queueProducer,
                qp -> qp.getQueueDepth() != null ? qp.getQueueDepth().doubleValue() : 0.0);
        }
    }

    public void recordSubmissionCreated(String language) {
        if (meterRegistry == null) return;
        Counter.builder("verniq.submissions.created.total")
            .description("Total number of submissions created")
            .tag("language", sanitize(language))
            .register(meterRegistry)
            .increment();
    }

    public void recordRateLimitHit() {
        if (meterRegistry == null) return;
        Counter.builder("verniq.submissions.ratelimited.total")
            .description("Total number of submissions blocked by rate limiting")
            .register(meterRegistry)
            .increment();
    }

    public void recordSubmissionVerdict(String language, String verdict, Long executionTimeMs) {
        if (meterRegistry == null) return;

        String safeVerdict = sanitize(verdict);
        String safeLang = sanitize(language);

        Counter.builder("verniq.submissions.completed.total")
            .description("Total number of submissions completed with a terminal verdict")
            .tag("language", safeLang)
            .tag("verdict", safeVerdict)
            .register(meterRegistry)
            .increment();

        if (executionTimeMs != null && executionTimeMs >= 0) {
            Timer.builder("verniq.submission.execution.time")
                .description("Execution time of judged submissions")
                .tag("language", safeLang)
                .tag("verdict", safeVerdict)
                .register(meterRegistry)
                .record(executionTimeMs, TimeUnit.MILLISECONDS);
        }
    }

    public void recordSubmissionFailed(String errorCategory) {
        if (meterRegistry == null) return;
        Counter.builder("verniq.submissions.failed.total")
            .description("Total number of submissions failing due to internal or judge error")
            .tag("category", sanitize(errorCategory))
            .register(meterRegistry)
            .increment();
    }

    private String sanitize(String val) {
        return (val == null || val.isBlank()) ? "unknown" : val.toLowerCase();
    }
}
