package com.verniq.api.common.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RequestIdFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Generated request ID starts with req_ when client provides no header")
    void testGeneratesRequestIdWhenMissing() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
            .andExpect(status().isOk())
            .andExpect(header().string("X-Request-ID", startsWith("req_")));
    }

    @Test
    @DisplayName("Preserves valid client-provided X-Request-ID")
    void testPreservesValidClientRequestId() throws Exception {
        String customId = "client-trace-abc-123_xyz";
        mockMvc.perform(get("/api/v1/health")
                .header("X-Request-ID", customId))
            .andExpect(status().isOk())
            .andExpect(header().string("X-Request-ID", equalTo(customId)));
    }

    @Test
    @DisplayName("Generates new request ID when client sends invalid characters")
    void testReplacesInvalidClientRequestId() throws Exception {
        String invalidId = "bad<script>id$$$";
        mockMvc.perform(get("/api/v1/health")
                .header("X-Request-ID", invalidId))
            .andExpect(status().isOk())
            .andExpect(header().string("X-Request-ID", startsWith("req_")))
            .andExpect(header().string("X-Request-ID", not(equalTo(invalidId))));
    }
}
