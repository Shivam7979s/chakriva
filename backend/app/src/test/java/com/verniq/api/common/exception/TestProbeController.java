package com.verniq.api.common.exception;

import com.verniq.api.common.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/test")
public class TestProbeController {

    public record TestValidationRequest(
        @NotBlank(message = "Title must not be blank")
        String title,

        @NotNull(message = "Score is required")
        Integer score
    ) {}

    @PostMapping("/validation")
    public ApiResponse<String> testValidation(@Valid @RequestBody TestValidationRequest request) {
        return ApiResponse.ok("Valid: " + request.title());
    }

    @GetMapping("/not-found")
    public ApiResponse<String> testNotFound() {
        throw new ResourceNotFoundException("TestProblem", "VRQ-999999");
    }

    @GetMapping("/bad-request")
    public ApiResponse<String> testBadRequest() {
        throw new InvalidRequestException("Invalid parameter value provided");
    }

    @GetMapping("/forbidden")
    public ApiResponse<String> testForbidden() {
        throw new ForbiddenException("Administrative access required");
    }

    @GetMapping("/server-error")
    public ApiResponse<String> testServerError() {
        throw new RuntimeException("Simulated unexpected internal database failure");
    }
}
