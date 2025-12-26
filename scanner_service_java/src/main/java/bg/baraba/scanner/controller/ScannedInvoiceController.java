package bg.baraba.scanner.controller;

import bg.baraba.scanner.model.dto.RecognizedInvoice;
import bg.baraba.scanner.service.ScannedInvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/scanned-invoices")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ScannedInvoiceController {

    private final ScannedInvoiceService invoiceService;

    /**
     * List scanned invoices for a company
     * GET /api/scanned-invoices?companyUid=xxx&status=PENDING&direction=PURCHASE
     */
    @GetMapping
    public ResponseEntity<List<RecognizedInvoice>> list(
            @RequestParam String companyUid,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String direction) {

        log.debug("Listing invoices for company {} with status={}, direction={}",
            companyUid, status, direction);

        List<RecognizedInvoice> invoices = invoiceService.findByCompany(companyUid, status, direction);
        return ResponseEntity.ok(invoices);
    }

    /**
     * Get single invoice
     * GET /api/scanned-invoices/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<RecognizedInvoice> get(@PathVariable Long id) {
        RecognizedInvoice invoice = invoiceService.findById(id);
        return ResponseEntity.ok(invoice);
    }

    /**
     * Update invoice
     * PUT /api/scanned-invoices/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<RecognizedInvoice> update(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates) {

        log.info("Updating invoice {}", id);
        RecognizedInvoice invoice = invoiceService.update(id, updates);
        return ResponseEntity.ok(invoice);
    }

    /**
     * Delete invoice
     * DELETE /api/scanned-invoices/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        log.info("Deleting invoice {}", id);
        invoiceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Validate invoice VAT via VIES
     * POST /api/scanned-invoices/{id}/validate-vies
     */
    @PostMapping("/{id}/validate-vies")
    public ResponseEntity<RecognizedInvoice> validateVies(@PathVariable Long id) {
        log.info("Validating VIES for invoice {}", id);
        RecognizedInvoice invoice = invoiceService.validateVies(id);
        return ResponseEntity.ok(invoice);
    }

    /**
     * Process invoice to journal entry
     * POST /api/scanned-invoices/{id}/process
     */
    @PostMapping("/{id}/process")
    public ResponseEntity<Map<String, Long>> process(@PathVariable Long id) {
        log.info("Processing invoice {} to journal entry", id);
        Long journalEntryId = invoiceService.processToJournalEntry(id);
        return ResponseEntity.ok(Map.of("journalEntryId", journalEntryId));
    }

    /**
     * Reject invoice
     * POST /api/scanned-invoices/{id}/reject
     */
    @PostMapping("/{id}/reject")
    public ResponseEntity<RecognizedInvoice> reject(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String reason = body.get("reason");
        log.info("Rejecting invoice {}: {}", id, reason);

        RecognizedInvoice invoice = invoiceService.reject(id, reason);
        return ResponseEntity.ok(invoice);
    }
}
