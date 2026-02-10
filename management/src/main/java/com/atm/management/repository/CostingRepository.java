package com.atm.management.repository;

import com.atm.management.model.Costing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CostingRepository extends JpaRepository<Costing, Long> {
    List<Costing> findByStatus(Costing.CostingStatus status);
    List<Costing> findByAtmId(Long atmId);
    List<Costing> findByVendorId(Long vendorId);

    @Modifying
    @Query("DELETE FROM Costing c WHERE c.atm.id IN (SELECT a.id FROM Atm a WHERE a.uploadedFile.id = :uploadedFileId)")
    int deleteByAtmUploadedFileId(Long uploadedFileId);

    @Query("SELECT COUNT(c) FROM Costing c WHERE c.status = 'PENDING'")
    Long countPendingApprovals();

    @Query("SELECT AVG(c.margin) FROM Costing c")
    Double getAverageMargin();
}