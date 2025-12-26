package bg.baraba.scanner.controller;

import bg.baraba.scanner.service.AzureDocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class HealthController {

    private final AzureDocumentService azureService;

    /**
     * Health check endpoint
     * GET /health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "service", "scanner-service",
            "version", "1.0.0",
            "timestamp", Instant.now().toString(),
            "azureMode", azureService.isMockMode() ? "mock" : "live"
        ));
    }

    /**
     * Readiness check
     * GET /ready
     */
    @GetMapping("/ready")
    public ResponseEntity<Map<String, String>> ready() {
        return ResponseEntity.ok(Map.of(
            "status", "ready"
        ));
    }

    /**
     * Liveness check
     * GET /live
     */
    @GetMapping("/live")
    public ResponseEntity<Map<String, String>> live() {
        return ResponseEntity.ok(Map.of(
            "status", "alive"
        ));
    }

    /**
     * Auth verification endpoint (for backwards compatibility)
     * GET /auth/verify
     */
    @GetMapping("/auth/verify")
    public ResponseEntity<Map<String, Object>> verifyAuth(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of(
                "valid", false,
                "message", "No authorization header"
            ));
        }

        // TODO: Implement proper JWT validation
        return ResponseEntity.ok(Map.of(
            "valid", true,
            "userId", 1,
            "username", "user"
        ));
    }
}
