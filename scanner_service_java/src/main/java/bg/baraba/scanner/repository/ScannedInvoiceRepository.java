package bg.baraba.scanner.repository;

import bg.baraba.scanner.model.entity.ScannedInvoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScannedInvoiceRepository extends JpaRepository<ScannedInvoice, Long> {

    List<ScannedInvoice> findByCompanyUidOrderByCreatedAtDesc(String companyUid);

    List<ScannedInvoice> findBySessionId(Long sessionId);

    List<ScannedInvoice> findByCompanyUidAndStatus(
        String companyUid,
        ScannedInvoice.ProcessingStatus status
    );

    List<ScannedInvoice> findByCompanyUidAndDirection(
        String companyUid,
        ScannedInvoice.InvoiceDirection direction
    );

    @Query("SELECT i FROM ScannedInvoice i WHERE i.companyUid = :companyUid " +
           "AND (:status IS NULL OR i.status = :status) " +
           "AND (:direction IS NULL OR i.direction = :direction) " +
           "ORDER BY i.createdAt DESC")
    List<ScannedInvoice> findByFilters(
        @Param("companyUid") String companyUid,
        @Param("status") ScannedInvoice.ProcessingStatus status,
        @Param("direction") ScannedInvoice.InvoiceDirection direction
    );

    long countByCompanyUidAndStatus(String companyUid, ScannedInvoice.ProcessingStatus status);
}
