package bg.baraba.scanner.service;

import bg.baraba.scanner.model.dto.RecognizedInvoice;
import bg.baraba.scanner.model.entity.ScannedInvoice;
import bg.baraba.scanner.repository.ScannedInvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScannedInvoiceService {

    private final ScannedInvoiceRepository invoiceRepository;
    private final ViesService viesService;

    /**
     * Find invoices by company with optional filters
     */
    public List<RecognizedInvoice> findByCompany(String companyUid, String status, String direction) {
        ScannedInvoice.ProcessingStatus statusEnum = null;
        ScannedInvoice.InvoiceDirection directionEnum = null;

        if (status != null && !status.isEmpty()) {
            try {
                statusEnum = ScannedInvoice.ProcessingStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status filter: {}", status);
            }
        }

        if (direction != null && !direction.isEmpty()) {
            try {
                directionEnum = ScannedInvoice.InvoiceDirection.valueOf(direction.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid direction filter: {}", direction);
            }
        }

        List<ScannedInvoice> entities = invoiceRepository.findByFilters(
            companyUid, statusEnum, directionEnum
        );

        return entities.stream()
            .map(this::mapToDto)
            .collect(Collectors.toList());
    }

    /**
     * Find invoice by ID
     */
    public RecognizedInvoice findById(Long id) {
        return invoiceRepository.findById(id)
            .map(this::mapToDto)
            .orElseThrow(() -> new RuntimeException("Invoice not found: " + id));
    }

    /**
     * Update invoice fields
     */
    @Transactional
    public RecognizedInvoice update(Long id, Map<String, Object> updates) {
        ScannedInvoice invoice = invoiceRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Invoice not found: " + id));

        // Apply updates
        if (updates.containsKey("vendorName")) {
            invoice.setVendorName((String) updates.get("vendorName"));
        }
        if (updates.containsKey("vendorVatNumber")) {
            invoice.setVendorVatNumber((String) updates.get("vendorVatNumber"));
        }
        if (updates.containsKey("customerName")) {
            invoice.setCustomerName((String) updates.get("customerName"));
        }
        if (updates.containsKey("customerVatNumber")) {
            invoice.setCustomerVatNumber((String) updates.get("customerVatNumber"));
        }
        if (updates.containsKey("invoiceNumber")) {
            invoice.setInvoiceNumber((String) updates.get("invoiceNumber"));
        }
        if (updates.containsKey("notes")) {
            invoice.setNotes((String) updates.get("notes"));
        }
        if (updates.containsKey("counterpartyAccountId")) {
            invoice.setCounterpartyAccountId(toLong(updates.get("counterpartyAccountId")));
        }
        if (updates.containsKey("vatAccountId")) {
            invoice.setVatAccountId(toLong(updates.get("vatAccountId")));
        }
        if (updates.containsKey("expenseRevenueAccountId")) {
            invoice.setExpenseRevenueAccountId(toLong(updates.get("expenseRevenueAccountId")));
        }

        invoice = invoiceRepository.save(invoice);
        return mapToDto(invoice);
    }

    /**
     * Delete invoice
     */
    @Transactional
    public void delete(Long id) {
        if (!invoiceRepository.existsById(id)) {
            throw new RuntimeException("Invoice not found: " + id);
        }
        invoiceRepository.deleteById(id);
        log.info("Deleted scanned invoice {}", id);
    }

    /**
     * Validate invoice VAT via VIES
     */
    @Transactional
    public RecognizedInvoice validateVies(Long id) {
        ScannedInvoice invoice = invoiceRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Invoice not found: " + id));

        // Determine which VAT to validate based on direction
        String vatToValidate = invoice.getDirection() == ScannedInvoice.InvoiceDirection.PURCHASE
            ? invoice.getVendorVatNumber()
            : invoice.getCustomerVatNumber();

        if (vatToValidate == null || vatToValidate.isEmpty()) {
            invoice.setViesStatus(ScannedInvoice.ViesStatus.NOT_APPLICABLE);
            invoice.setViesValidationMessage("No VAT number to validate");
        } else {
            ViesService.ViesResult result = viesService.validateVat(vatToValidate);

            if (result.isNotApplicable()) {
                invoice.setViesStatus(ScannedInvoice.ViesStatus.NOT_APPLICABLE);
            } else if (result.isError()) {
                invoice.setViesStatus(ScannedInvoice.ViesStatus.ERROR);
            } else if (result.isValid()) {
                invoice.setViesStatus(ScannedInvoice.ViesStatus.VALID);
                invoice.setViesCompanyName(result.getCompanyName());
                invoice.setViesCompanyAddress(result.getCompanyAddress());

                // Update status to VALIDATED if was PENDING
                if (invoice.getStatus() == ScannedInvoice.ProcessingStatus.PENDING) {
                    invoice.setStatus(ScannedInvoice.ProcessingStatus.VALIDATED);
                }
            } else {
                invoice.setViesStatus(ScannedInvoice.ViesStatus.INVALID);
            }

            invoice.setViesValidationMessage(result.getMessage());
            invoice.setViesValidatedAt(Instant.now());
        }

        invoice = invoiceRepository.save(invoice);
        log.info("VIES validation for invoice {}: {}", id, invoice.getViesStatus());

        return mapToDto(invoice);
    }

    /**
     * Reject invoice
     */
    @Transactional
    public RecognizedInvoice reject(Long id, String reason) {
        ScannedInvoice invoice = invoiceRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Invoice not found: " + id));

        invoice.setStatus(ScannedInvoice.ProcessingStatus.REJECTED);
        invoice.setNotes(reason);

        invoice = invoiceRepository.save(invoice);
        log.info("Rejected invoice {}: {}", id, reason);

        return mapToDto(invoice);
    }

    /**
     * Process invoice to journal entry
     * Returns the journal entry ID (actual creation is done by Phoenix)
     */
    @Transactional
    public Long processToJournalEntry(Long id) {
        ScannedInvoice invoice = invoiceRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Invoice not found: " + id));

        if (invoice.getStatus() == ScannedInvoice.ProcessingStatus.PROCESSED) {
            throw new RuntimeException("Invoice already processed");
        }
        if (invoice.getStatus() == ScannedInvoice.ProcessingStatus.REJECTED) {
            throw new RuntimeException("Cannot process rejected invoice");
        }

        // TODO: Call Phoenix API to create journal entry
        // For now, just mark as processed with a placeholder ID
        Long journalEntryId = System.currentTimeMillis(); // Placeholder

        invoice.setStatus(ScannedInvoice.ProcessingStatus.PROCESSED);
        invoice.setJournalEntryId(journalEntryId);
        invoiceRepository.save(invoice);

        log.info("Processed invoice {} to journal entry {}", id, journalEntryId);

        return journalEntryId;
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

    private Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Long) return (Long) value;
        if (value instanceof Integer) return ((Integer) value).longValue();
        if (value instanceof String) return Long.parseLong((String) value);
        return null;
    }
}
