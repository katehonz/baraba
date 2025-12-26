package bg.baraba.scanner.controller;

import bg.baraba.scanner.model.dto.*;
import bg.baraba.scanner.model.entity.ScannedInvoice;
import bg.baraba.scanner.service.BatchScanService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/scan")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ScanController {

    private final BatchScanService batchScanService;

    /**
     * Upload multiple files for batch scanning
     * Files will be grouped into batches of 10 and processed asynchronously
     *
     * POST /api/scan/batch
     */
    @PostMapping(value = "/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BatchUploadResponse> uploadBatch(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam("companyUid") String companyUid,
            @RequestParam("invoiceType") String invoiceType,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        log.info("Received batch upload: {} files for company {}", files.size(), companyUid);

        // Validate
        if (files.isEmpty()) {
            return ResponseEntity.badRequest().body(
                BatchUploadResponse.builder()
                    .status("ERROR")
                    .message("No files provided")
                    .build()
            );
        }

        // Extract user ID from JWT (simplified for now)
        Long userId = extractUserId(authHeader);

        // Start batch processing
        BatchUploadResponse response = batchScanService.startBatchProcessing(
            files, companyUid, invoiceType, userId
        );

        return ResponseEntity.accepted().body(response);
    }

    /**
     * Single file scan (backwards compatibility with old Nim API)
     *
     * POST /api/scan or POST /scan
     */
    @PostMapping(value = {"", "/"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RecognizedInvoice> scanSingle(
            @RequestParam("file") MultipartFile file,
            @RequestParam("companyUid") String companyUid,
            @RequestParam("invoiceType") String invoiceType,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        log.info("Received single file scan: {} for company {}",
            file.getOriginalFilename(), companyUid);

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Long userId = extractUserId(authHeader);

        RecognizedInvoice result = batchScanService.scanSingleFile(
            file, companyUid, invoiceType, userId
        );

        return ResponseEntity.ok(result);
    }

    /**
     * Legacy endpoint for old frontend compatibility
     * POST /scan
     */
    @PostMapping(value = "/scan", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RecognizedInvoice> scanLegacy(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "companyId", required = false) String companyId,
            @RequestParam(value = "companyUid", required = false) String companyUid,
            @RequestParam("invoiceType") String invoiceType,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        // Support both companyId and companyUid for backwards compatibility
        String company = companyUid != null ? companyUid : companyId;

        log.info("Legacy scan endpoint: {} for company {}", file.getOriginalFilename(), company);

        Long userId = extractUserId(authHeader);

        RecognizedInvoice result = batchScanService.scanSingleFile(
            file, company, invoiceType, userId
        );

        return ResponseEntity.ok(result);
    }

    /**
     * Save scanned invoice to database
     * POST /api/scan/save
     */
    @PostMapping("/save")
    public ResponseEntity<ScannedInvoice> saveScannedInvoice(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        String companyUid = (String) body.get("companyUid");
        String fileName = (String) body.get("fileName");

        @SuppressWarnings("unchecked")
        Map<String, Object> recognized = (Map<String, Object>) body.get("recognized");

        Long userId = extractUserId(authHeader);

        RecognizedInvoice dto = mapFromRequest(recognized);
        ScannedInvoice saved = batchScanService.saveScannedInvoice(dto, companyUid, fileName, userId);

        return ResponseEntity.ok(saved);
    }

    private Long extractUserId(String authHeader) {
        // TODO: Implement proper JWT validation
        // For now, return a default user ID
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return 1L;
        }

        // Parse JWT and extract user ID
        // String token = authHeader.substring(7);
        // ... validate and extract claims ...

        return 1L;
    }

    private RecognizedInvoice mapFromRequest(Map<String, Object> data) {
        return RecognizedInvoice.builder()
            .vendorName((String) data.get("vendorName"))
            .vendorVatNumber((String) data.get("vendorVatNumber"))
            .vendorAddress((String) data.get("vendorAddress"))
            .customerName((String) data.get("customerName"))
            .customerVatNumber((String) data.get("customerVatNumber"))
            .customerAddress((String) data.get("customerAddress"))
            .invoiceId((String) data.get("invoiceId"))
            .invoiceDate((String) data.get("invoiceDate"))
            .dueDate((String) data.get("dueDate"))
            .subtotal(toBigDecimal(data.get("subtotal")))
            .totalTax(toBigDecimal(data.get("totalTax")))
            .invoiceTotal(toBigDecimal(data.get("invoiceTotal")))
            .direction((String) data.get("direction"))
            .requiresManualReview((Boolean) data.getOrDefault("requiresManualReview", false))
            .manualReviewReason((String) data.get("manualReviewReason"))
            .build();
    }

    private java.math.BigDecimal toBigDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof java.math.BigDecimal) return (java.math.BigDecimal) value;
        if (value instanceof Number) return java.math.BigDecimal.valueOf(((Number) value).doubleValue());
        if (value instanceof String) return new java.math.BigDecimal((String) value);
        return null;
    }
}
