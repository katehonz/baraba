package bg.baraba.scanner.service;

import bg.baraba.scanner.model.dto.*;
import bg.baraba.scanner.model.entity.*;
import bg.baraba.scanner.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatchScanService {

    private final ScanSessionRepository sessionRepository;
    private final ScanSessionFileRepository fileRepository;
    private final ScannedInvoiceRepository invoiceRepository;
    private final PdfMergeService pdfMergeService;
    private final AzureDocumentService azureService;
    private final ImageCompressionService compressionService;

    @Value("${scanner.batch-size:10}")
    private int batchSize;

    @Value("${scanner.temp-dir:/tmp/scanner-uploads}")
    private String tempDir;

    /**
     * Start batch processing - returns immediately with session ID
     * Processing happens asynchronously
     */
    @Transactional
    public BatchUploadResponse startBatchProcessing(
            List<MultipartFile> files,
            String companyUid,
            String invoiceType,
            Long userId) {

        log.info("Starting batch upload: {} files for company {}", files.size(), companyUid);

        // Validate
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("No files provided");
        }

        // Create session
        int totalBatches = (int) Math.ceil((double) files.size() / batchSize);

        ScanSession session = ScanSession.builder()
            .companyUid(companyUid)
            .invoiceType(ScanSession.InvoiceType.valueOf(invoiceType.toUpperCase()))
            .status(ScanSession.SessionStatus.PENDING)
            .totalFiles(files.size())
            .totalBatches(totalBatches)
            .createdById(userId)
            .build();

        session = sessionRepository.save(session);

        // Save files and assign to batches
        int batchNumber = 1;
        int pageInBatch = 1;

        for (MultipartFile file : files) {
            String filePath = saveToTemp(file, session.getId());

            ScanSessionFile sessionFile = ScanSessionFile.builder()
                .sessionId(session.getId())
                .fileName(file.getOriginalFilename())
                .filePath(filePath)
                .fileSize(file.getSize())
                .batchNumber(batchNumber)
                .pageInBatch(pageInBatch)
                .status(ScanSessionFile.FileStatus.PENDING)
                .build();

            fileRepository.save(sessionFile);

            pageInBatch++;
            if (pageInBatch > batchSize) {
                batchNumber++;
                pageInBatch = 1;
            }
        }

        // Start async processing
        Long sessionId = session.getId();
        processBatchesAsync(sessionId);

        return BatchUploadResponse.builder()
            .sessionId(session.getId())
            .totalFiles(files.size())
            .totalBatches(totalBatches)
            .status("PROCESSING")
            .createdAt(session.getCreatedAt())
            .message("Batch processing started. Poll /api/scan/sessions/" +
                     session.getId() + "/status for progress.")
            .build();
    }

    /**
     * Process all batches asynchronously
     */
    @Async
    public void processBatchesAsync(Long sessionId) {
        log.info("Starting async batch processing for session {}", sessionId);

        ScanSession session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        session.setStatus(ScanSession.SessionStatus.PROCESSING);
        sessionRepository.save(session);

        try {
            int totalBatches = session.getTotalBatches();

            for (int batchNum = 1; batchNum <= totalBatches; batchNum++) {
                processSingleBatch(sessionId, batchNum);
            }

            // Reload session and mark complete
            session = sessionRepository.findById(sessionId).orElseThrow();
            session.setStatus(ScanSession.SessionStatus.COMPLETED);
            session.setCompletedAt(Instant.now());
            sessionRepository.save(session);

            log.info("Batch processing completed for session {}", sessionId);

            // Cleanup temp files
            cleanupSessionFiles(sessionId);

        } catch (Exception e) {
            log.error("Batch processing failed for session {}", sessionId, e);
            session = sessionRepository.findById(sessionId).orElseThrow();
            session.setStatus(ScanSession.SessionStatus.FAILED);
            session.setErrorMessage(e.getMessage());
            sessionRepository.save(session);
        }
    }

    /**
     * Process a single batch (10 pages)
     */
    @Transactional
    public void processSingleBatch(Long sessionId, int batchNumber) {
        log.info("Processing batch {} for session {}", batchNumber, sessionId);

        ScanSession session = sessionRepository.findById(sessionId).orElseThrow();

        // Get files for this batch
        List<ScanSessionFile> files = fileRepository
            .findBySessionIdAndBatchNumber(sessionId, batchNumber);

        if (files.isEmpty()) {
            log.warn("No files found for batch {} in session {}", batchNumber, sessionId);
            return;
        }

        try {
            // Compress and collect PDF data
            List<byte[]> pdfPages = new ArrayList<>();
            for (ScanSessionFile file : files) {
                byte[] compressed = compressionService.compressIfNeeded(file.getFilePath());
                pdfPages.add(compressed);
            }

            // Merge into single PDF
            byte[] mergedPdf = pdfMergeService.mergePdfs(pdfPages);
            log.info("Merged batch {} into {} bytes PDF", batchNumber, mergedPdf.length);

            // Send to Azure
            List<RecognizedInvoice> invoices = azureService.recognizeInvoices(
                mergedPdf,
                session.getInvoiceType().name()
            );

            log.info("Azure recognized {} invoices from batch {}", invoices.size(), batchNumber);

            // Save invoices to DB
            for (int i = 0; i < files.size(); i++) {
                ScanSessionFile file = files.get(i);

                // Get corresponding recognized invoice (or use first one if fewer results)
                RecognizedInvoice recognized = invoices.isEmpty() ? null :
                    invoices.get(Math.min(i, invoices.size() - 1));

                if (recognized != null) {
                    ScannedInvoice entity = mapToEntity(recognized, session, file);
                    invoiceRepository.save(entity);
                }

                file.setStatus(ScanSessionFile.FileStatus.COMPLETED);
                fileRepository.save(file);
            }

            // Update session progress
            session.setProcessedBatches(session.getProcessedBatches() + 1);
            session.setProcessedFiles(session.getProcessedFiles() + files.size());
            sessionRepository.save(session);

            log.info("Batch {} completed. Progress: {}/{} batches, {}/{} files",
                batchNumber,
                session.getProcessedBatches(), session.getTotalBatches(),
                session.getProcessedFiles(), session.getTotalFiles());

        } catch (Exception e) {
            log.error("Failed to process batch {} for session {}", batchNumber, sessionId, e);

            // Mark files as failed
            for (ScanSessionFile file : files) {
                file.setStatus(ScanSessionFile.FileStatus.FAILED);
                file.setErrorMessage(e.getMessage());
                fileRepository.save(file);
            }

            throw e;
        }
    }

    /**
     * Scan single file (backwards compatibility with old API)
     */
    public RecognizedInvoice scanSingleFile(
            MultipartFile file,
            String companyUid,
            String invoiceType,
            Long userId) {

        log.info("Scanning single file: {} for company {}", file.getOriginalFilename(), companyUid);

        // Compress if needed
        byte[] compressed = compressionService.compressIfNeeded(file);

        // Send to Azure
        List<RecognizedInvoice> invoices = azureService.recognizeInvoices(compressed, invoiceType);

        if (invoices.isEmpty()) {
            throw new RuntimeException("No invoice data recognized from file");
        }

        RecognizedInvoice result = invoices.get(0);
        result.setOriginalFileName(file.getOriginalFilename());

        return result;
    }

    /**
     * Save scanned invoice to database (for single file flow)
     */
    @Transactional
    public ScannedInvoice saveScannedInvoice(
            RecognizedInvoice recognized,
            String companyUid,
            String fileName,
            Long userId) {

        ScannedInvoice entity = ScannedInvoice.builder()
            .companyUid(companyUid)
            .direction(ScannedInvoice.InvoiceDirection.valueOf(recognized.getDirection()))
            .vendorName(recognized.getVendorName())
            .vendorVatNumber(recognized.getVendorVatNumber())
            .vendorAddress(recognized.getVendorAddress())
            .customerName(recognized.getCustomerName())
            .customerVatNumber(recognized.getCustomerVatNumber())
            .customerAddress(recognized.getCustomerAddress())
            .invoiceNumber(recognized.getInvoiceId())
            .invoiceDate(parseDate(recognized.getInvoiceDate()))
            .dueDate(parseDate(recognized.getDueDate()))
            .subtotal(recognized.getSubtotal())
            .totalTax(recognized.getTotalTax())
            .invoiceTotal(recognized.getInvoiceTotal())
            .confidence(recognized.getConfidence())
            .originalFileName(fileName)
            .requiresManualReview(recognized.getRequiresManualReview())
            .manualReviewReason(recognized.getManualReviewReason())
            .createdById(userId)
            .build();

        return invoiceRepository.save(entity);
    }

    private String saveToTemp(MultipartFile file, Long sessionId) {
        try {
            Path sessionDir = Path.of(tempDir, "session-" + sessionId);
            Files.createDirectories(sessionDir);

            String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path filePath = sessionDir.resolve(fileName);

            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            return filePath.toString();
        } catch (IOException e) {
            log.error("Failed to save file to temp: {}", file.getOriginalFilename(), e);
            throw new RuntimeException("Failed to save file", e);
        }
    }

    private void cleanupSessionFiles(Long sessionId) {
        try {
            Path sessionDir = Path.of(tempDir, "session-" + sessionId);
            if (Files.exists(sessionDir)) {
                Files.walk(sessionDir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.delete(path);
                        } catch (IOException e) {
                            log.warn("Failed to delete: {}", path);
                        }
                    });
                log.info("Cleaned up temp files for session {}", sessionId);
            }
        } catch (IOException e) {
            log.warn("Failed to cleanup session {} temp files: {}", sessionId, e.getMessage());
        }
    }

    private ScannedInvoice mapToEntity(
            RecognizedInvoice dto,
            ScanSession session,
            ScanSessionFile file) {

        return ScannedInvoice.builder()
            .sessionId(session.getId())
            .sessionFileId(file.getId())
            .companyUid(session.getCompanyUid())
            .direction(ScannedInvoice.InvoiceDirection.valueOf(dto.getDirection()))
            .vendorName(dto.getVendorName())
            .vendorVatNumber(dto.getVendorVatNumber())
            .vendorAddress(dto.getVendorAddress())
            .customerName(dto.getCustomerName())
            .customerVatNumber(dto.getCustomerVatNumber())
            .customerAddress(dto.getCustomerAddress())
            .invoiceNumber(dto.getInvoiceId())
            .invoiceDate(parseDate(dto.getInvoiceDate()))
            .dueDate(parseDate(dto.getDueDate()))
            .subtotal(dto.getSubtotal())
            .totalTax(dto.getTotalTax())
            .invoiceTotal(dto.getInvoiceTotal())
            .confidence(dto.getConfidence())
            .originalFileName(file.getFileName())
            .requiresManualReview(dto.getRequiresManualReview())
            .manualReviewReason(dto.getManualReviewReason())
            .createdById(session.getCreatedById())
            .build();
    }

    private LocalDate parseDate(String date) {
        if (date == null || date.isEmpty()) return null;
        try {
            return LocalDate.parse(date);
        } catch (Exception e) {
            log.warn("Failed to parse date: {}", date);
            return null;
        }
    }
}
