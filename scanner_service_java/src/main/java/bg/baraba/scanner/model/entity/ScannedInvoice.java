package bg.baraba.scanner.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "scanned_invoices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScannedInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id")
    private Long sessionId;

    @Column(name = "session_file_id")
    private Long sessionFileId;

    @Column(name = "company_uid", nullable = false)
    private String companyUid;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private InvoiceDirection direction;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ProcessingStatus status = ProcessingStatus.PENDING;

    // Vendor info
    @Column(name = "vendor_name")
    private String vendorName;

    @Column(name = "vendor_vat_number")
    private String vendorVatNumber;

    @Column(name = "vendor_address")
    private String vendorAddress;

    // Customer info
    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "customer_vat_number")
    private String customerVatNumber;

    @Column(name = "customer_address")
    private String customerAddress;

    // Invoice details
    @Column(name = "invoice_number")
    private String invoiceNumber;

    @Column(name = "invoice_date")
    private LocalDate invoiceDate;

    @Column(name = "due_date")
    private LocalDate dueDate;

    // Amounts
    @Column(precision = 15, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "total_tax", precision = 15, scale = 2)
    private BigDecimal totalTax;

    @Column(name = "invoice_total", precision = 15, scale = 2)
    private BigDecimal invoiceTotal;

    // VIES validation
    @Column(name = "vies_status")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ViesStatus viesStatus = ViesStatus.PENDING;

    @Column(name = "vies_validation_message")
    private String viesValidationMessage;

    @Column(name = "vies_company_name")
    private String viesCompanyName;

    @Column(name = "vies_company_address")
    private String viesCompanyAddress;

    @Column(name = "vies_validated_at")
    private Instant viesValidatedAt;

    // Selected accounts
    @Column(name = "counterparty_account_id")
    private Long counterpartyAccountId;

    @Column(name = "vat_account_id")
    private Long vatAccountId;

    @Column(name = "expense_revenue_account_id")
    private Long expenseRevenueAccountId;

    // Review flags
    @Column(name = "requires_manual_review")
    @Builder.Default
    private Boolean requiresManualReview = false;

    @Column(name = "manual_review_reason")
    private String manualReviewReason;

    @Column
    private String notes;

    // Processing metadata
    @Column(precision = 5, scale = 4)
    private BigDecimal confidence;

    @Column(name = "original_file_name")
    private String originalFileName;

    @Column(name = "journal_entry_id")
    private Long journalEntryId;

    // Audit
    @Column(name = "created_by_id")
    private Long createdById;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public enum InvoiceDirection {
        PURCHASE, SALE
    }

    public enum ProcessingStatus {
        PENDING, VALIDATED, REJECTED, PROCESSED
    }

    public enum ViesStatus {
        PENDING, VALID, INVALID, NOT_APPLICABLE, ERROR
    }
}
