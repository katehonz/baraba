package bg.baraba.scanner.model.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecognizedInvoice {
    private Long id;
    private String vendorName;
    private String vendorVatNumber;
    private String vendorAddress;
    private String customerName;
    private String customerVatNumber;
    private String customerAddress;
    private String invoiceId;
    private String invoiceDate;
    private String dueDate;
    private BigDecimal subtotal;
    private BigDecimal totalTax;
    private BigDecimal invoiceTotal;
    private String direction;
    private String status;
    private String validationStatus;
    private String viesValidationMessage;
    private SuggestedAccounts suggestedAccounts;
    private Boolean requiresManualReview;
    private String manualReviewReason;
    private BigDecimal confidence;
    private String originalFileName;
    private Long sessionId;
    private Long journalEntryId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SuggestedAccounts {
        private AccountRef counterpartyAccount;
        private AccountRef vatAccount;
        private AccountRef expenseOrRevenueAccount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AccountRef {
        private Long id;
        private String code;
        private String name;
    }
}
