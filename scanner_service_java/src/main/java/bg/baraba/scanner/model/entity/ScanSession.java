package bg.baraba.scanner.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "scan_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScanSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_uid", nullable = false)
    private String companyUid;

    @Column(name = "invoice_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private InvoiceType invoiceType;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private SessionStatus status = SessionStatus.PENDING;

    @Column(name = "total_files")
    @Builder.Default
    private Integer totalFiles = 0;

    @Column(name = "processed_files")
    @Builder.Default
    private Integer processedFiles = 0;

    @Column(name = "total_batches")
    @Builder.Default
    private Integer totalBatches = 0;

    @Column(name = "processed_batches")
    @Builder.Default
    private Integer processedBatches = 0;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "created_by_id")
    private Long createdById;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public enum SessionStatus {
        PENDING, PROCESSING, COMPLETED, FAILED
    }

    public enum InvoiceType {
        PURCHASE, SALES
    }

    public double getProgressPercent() {
        if (totalFiles == null || totalFiles == 0) return 0;
        return (processedFiles * 100.0) / totalFiles;
    }
}
