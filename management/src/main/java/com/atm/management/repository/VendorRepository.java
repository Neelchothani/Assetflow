package com.atm.management.repository;

import com.atm.management.model.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VendorRepository extends JpaRepository<Vendor, Long> {
    Optional<Vendor> findByEmail(String email);
    Optional<Vendor> findByNameIgnoreCase(String name);
    List<Vendor> findByStatus(Vendor.VendorStatus status);

    @Query("SELECT v FROM Vendor v WHERE v.name LIKE %?1%")
    List<Vendor> searchByName(String keyword);

    @Query("SELECT COUNT(v) FROM Vendor v WHERE v.status = 'ACTIVE'")
    Long countActiveVendors();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Vendor v WHERE v.uploadedFile.id = ?1 AND v.id NOT IN (SELECT DISTINCT a.vendor.id FROM Atm a WHERE a.vendor IS NOT NULL)")
    int deleteByUploadedFileId(Long uploadedFileId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Vendor v SET v.uploadedFile = null WHERE v.uploadedFile.id = ?1")
    int clearUploadedFileReference(Long uploadedFileId);
}