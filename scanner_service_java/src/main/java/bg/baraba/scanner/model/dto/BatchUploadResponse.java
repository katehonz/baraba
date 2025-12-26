package bg.baraba.scanner.model.dto;

import lombok.*;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchUploadResponse {
    private Long sessionId;
    private Integer totalFiles;
    private Integer totalBatches;
    private String status;
    private Instant createdAt;
    private String message;
}
