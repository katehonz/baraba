package bg.baraba.scanner.repository;

import bg.baraba.scanner.model.entity.ScanSessionFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScanSessionFileRepository extends JpaRepository<ScanSessionFile, Long> {

    List<ScanSessionFile> findBySessionId(Long sessionId);

    List<ScanSessionFile> findBySessionIdAndBatchNumber(Long sessionId, Integer batchNumber);

    List<ScanSessionFile> findBySessionIdOrderByBatchNumberAscPageInBatchAsc(Long sessionId);
}
