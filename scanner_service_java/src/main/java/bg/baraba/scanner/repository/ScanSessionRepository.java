package bg.baraba.scanner.repository;

import bg.baraba.scanner.model.entity.ScanSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScanSessionRepository extends JpaRepository<ScanSession, Long> {

    List<ScanSession> findByCompanyUidOrderByCreatedAtDesc(String companyUid);

    List<ScanSession> findByStatus(ScanSession.SessionStatus status);

    List<ScanSession> findByCompanyUidAndStatus(String companyUid, ScanSession.SessionStatus status);
}
