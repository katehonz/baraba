package bg.baraba.scanner.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "scan_session_files")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScanSessionFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "batch_number")
    private Integer batchNumber;

    @Column(name = "page_in_batch")
    private Integer pageInBatch;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private FileStatus status = FileStatus.PENDING;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    public enum FileStatus {
        PENDING, PROCESSING, COMPLETED, FAILED
    }
}
