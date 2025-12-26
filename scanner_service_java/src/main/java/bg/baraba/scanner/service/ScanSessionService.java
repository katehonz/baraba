package bg.baraba.scanner.service;

import bg.baraba.scanner.model.dto.RecognizedInvoice;
import bg.baraba.scanner.model.dto.SessionStatusResponse;
import bg.baraba.scanner.model.entity.ScanSession;
import bg.baraba.scanner.model.entity.ScannedInvoice;
import bg.baraba.scanner.repository.ScanSessionRepository;
import bg.baraba.scanner.repository.ScannedInvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanSessionService {

    private final ScanSessionRepository sessionRepository;
    private final ScannedInvoiceRepository invoiceRepository;

    /**
     * Get session status with progress info
     */
    public SessionStatusResponse getSessionStatus(Long sessionId) {
        ScanSession session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        // Get invoices processed so far
        List<ScannedInvoice> invoices = invoiceRepository.findBySessionId(sessionId);

        List<RecognizedInvoice> invoiceDtos = invoices.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());

        return SessionStatusResponse.builder()
            .sessionId(session.getId())
            .status(session.getStatus().name())
            .totalFiles(session.getTotalFiles())
            .processedFiles(session.getProcessedFiles())
            .totalBatches(session.getTotalBatches())
            .processedBatches(session.getProcessedBatches())
            .progressPercent(session.getProgressPercent())
            .errorMessage(session.getErrorMessage())
            .createdAt(session.getCreatedAt())
            .completedAt(session.getCompletedAt())
            .invoices(invoiceDtos)
            .build();
    }

    /**
     * Get all invoices from a session
     */
    public List<RecognizedInvoice> getSessionInvoices(Long sessionId) {
        List<ScannedInvoice> invoices = invoiceRepository.findBySessionId(sessionId);

        return invoices.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    /**
     * Cancel a running session
     */
    @Transactional
    public void cancelSession(Long sessionId) {
        ScanSession session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));

        if (session.getStatus() == ScanSession.SessionStatus.COMPLETED ||
            session.getStatus() == ScanSession.SessionStatus.FAILED) {
            throw new RuntimeException("Cannot cancel completed or failed session");
        }

        session.setStatus(ScanSession.SessionStatus.FAILED);
        session.setErrorMessage("Cancelled by user");
        sessionRepository.save(session);

        log.info("Cancelled session {}", sessionId);
    }

    /**
     * Get sessions for a company
     */
    public List<SessionStatusResponse> getCompanySessions(String companyUid) {
        List<ScanSession> sessions = sessionRepository.findByCompanyUidOrderByCreatedAtDesc(companyUid);

        return sessions.stream()
            .map(session -> SessionStatusResponse.builder()
                .sessionId(session.getId())
                .status(session.getStatus().name())
                .totalFiles(session.getTotalFiles())
                .processedFiles(session.getProcessedFiles())
                .totalBatches(session.getTotalBatches())
                .processedBatches(session.getProcessedBatches())
                .progressPercent(session.getProgressPercent())
                .errorMessage(session.getErrorMessage())
                .createdAt(session.getCreatedAt())
                .completedAt(session.getCompletedAt())
                .build())
            .collect(Collectors.toList());
    }

    private RecognizedInvoice mapToDto(ScannedInvoice entity) {
        return RecognizedInvoice.builder()
            .id(entity.getId())
            .vendorName(entity.getVendorName())
            .vendorVatNumber(entity.getVendorVatNumber())
            .vendorAddress(entity.getVendorAddress())
            .customerName(entity.getCustomerName())
            .customerVatNumber(entity.getCustomerVatNumber())
            .customerAddress(entity.getCustomerAddress())
            .invoiceId(entity.getInvoiceNumber())
            .invoiceDate(entity.getInvoiceDate() != null ? entity.getInvoiceDate().toString() : null)
            .dueDate(entity.getDueDate() != null ? entity.getDueDate().toString() : null)
            .subtotal(entity.getSubtotal())
            .totalTax(entity.getTotalTax())
            .invoiceTotal(entity.getInvoiceTotal())
            .direction(entity.getDirection().name())
            .status(entity.getStatus().name())
            .validationStatus(entity.getViesStatus().name())
            .viesValidationMessage(entity.getViesValidationMessage())
            .requiresManualReview(entity.getRequiresManualReview())
            .manualReviewReason(entity.getManualReviewReason())
            .confidence(entity.getConfidence())
            .originalFileName(entity.getOriginalFileName())
            .sessionId(entity.getSessionId())
            .journalEntryId(entity.getJournalEntryId())
            .build();
    }
}
