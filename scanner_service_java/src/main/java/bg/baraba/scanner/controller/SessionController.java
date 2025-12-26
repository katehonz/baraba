package bg.baraba.scanner.controller;

import bg.baraba.scanner.model.dto.RecognizedInvoice;
import bg.baraba.scanner.model.dto.SessionStatusResponse;
import bg.baraba.scanner.service.ScanSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/scan/sessions")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class SessionController {

    private final ScanSessionService sessionService;

    /**
     * Get session status and progress
     * GET /api/scan/sessions/{sessionId}/status
     */
    @GetMapping("/{sessionId}/status")
    public ResponseEntity<SessionStatusResponse> getStatus(@PathVariable Long sessionId) {
        log.debug("Getting status for session {}", sessionId);

        SessionStatusResponse status = sessionService.getSessionStatus(sessionId);
        return ResponseEntity.ok(status);
    }

    /**
     * Get all invoices from a session
     * GET /api/scan/sessions/{sessionId}/invoices
     */
    @GetMapping("/{sessionId}/invoices")
    public ResponseEntity<List<RecognizedInvoice>> getInvoices(@PathVariable Long sessionId) {
        List<RecognizedInvoice> invoices = sessionService.getSessionInvoices(sessionId);
        return ResponseEntity.ok(invoices);
    }

    /**
     * Cancel a running session
     * POST /api/scan/sessions/{sessionId}/cancel
     */
    @PostMapping("/{sessionId}/cancel")
    public ResponseEntity<Map<String, String>> cancelSession(@PathVariable Long sessionId) {
        log.info("Cancelling session {}", sessionId);

        try {
            sessionService.cancelSession(sessionId);
            return ResponseEntity.ok(Map.of(
                "status", "cancelled",
                "message", "Session cancelled successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "status", "error",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Get sessions for a company
     * GET /api/scan/sessions?companyUid=xxx
     */
    @GetMapping
    public ResponseEntity<List<SessionStatusResponse>> getCompanySessions(
            @RequestParam String companyUid) {
        List<SessionStatusResponse> sessions = sessionService.getCompanySessions(companyUid);
        return ResponseEntity.ok(sessions);
    }
}
