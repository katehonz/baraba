package com.baraba.jasper.controller;

import com.baraba.jasper.model.ReportRequest;
import com.baraba.jasper.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "healthy");
        response.put("service", "jasper-service");
        response.put("version", "1.0.0");
        response.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generateReport(@RequestBody ReportRequest request) {
        try {
            byte[] reportData = reportService.generateReport(request);

            String filename = request.getReportName() + "_" +
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) +
                reportService.getFileExtension(request.getFormat());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(reportService.getContentType(request.getFormat())));
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(reportData.length);

            return new ResponseEntity<>(reportData, headers, HttpStatus.OK);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            error.put("reportName", request.getReportName());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/generate/{reportName}")
    public ResponseEntity<?> generateReportGet(
            @PathVariable String reportName,
            @RequestParam(defaultValue = "pdf") String format,
            @RequestParam Map<String, String> allParams) {

        // Remove format from params to avoid passing it as report parameter
        allParams.remove("format");

        ReportRequest request = new ReportRequest();
        request.setReportName(reportName);
        request.setFormat(format);
        request.setParameters(new HashMap<>(allParams));

        return generateReport(request);
    }

    @GetMapping("/templates")
    public ResponseEntity<Map<String, Object>> listTemplates() {
        // List available report templates (only real ones that exist)
        Map<String, Object> response = new HashMap<>();
        response.put("templates", List.of(
            Map.of("name", "trial_balance_6col", "description", "Trial Balance (6 columns)", "formats", List.of("pdf", "xlsx")),
            Map.of("name", "journal_chronological", "description", "Chronological Journal", "formats", List.of("pdf", "xlsx", "csv")),
            Map.of("name", "trial_balance", "description", "Trial Balance (Simple)", "formats", List.of("pdf", "xlsx")),
            Map.of("name", "journal_entries", "description", "Journal Entries", "formats", List.of("pdf", "xlsx", "csv")),
            Map.of("name", "counterparts", "description", "Counterparts Report", "formats", List.of("pdf", "xlsx", "csv")),
            Map.of("name", "balance_sheet_new", "description", "Balance Sheet", "formats", List.of("pdf", "xlsx")),
            Map.of("name", "income_statement", "description", "Income Statement", "formats", List.of("pdf", "xlsx"))
        ));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/formats")
    public ResponseEntity<Map<String, Object>> listFormats() {
        Map<String, Object> response = new HashMap<>();
        response.put("formats", List.of(
            Map.of("id", "pdf", "name", "PDF", "contentType", "application/pdf"),
            Map.of("id", "xlsx", "name", "Excel (XLSX)", "contentType", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            Map.of("id", "html", "name", "HTML", "contentType", "text/html"),
            Map.of("id", "csv", "name", "CSV", "contentType", "text/csv")
        ));
        return ResponseEntity.ok(response);
    }
}
