package bg.baraba.scanner.model.dto;

import lombok.*;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionStatusResponse {
    private Long sessionId;
    private String status;
    private Integer totalFiles;
    private Integer processedFiles;
    private Integer totalBatches;
    private Integer processedBatches;
    private Double progressPercent;
    private String errorMessage;
    private Instant createdAt;
    private Instant completedAt;
    private List<RecognizedInvoice> invoices;
}
