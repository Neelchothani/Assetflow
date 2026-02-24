package com.atm.management.repository;

import com.atm.management.model.Atm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AtmRepository extends JpaRepository<Atm, Long> {
    Optional<Atm> findBySerialNumber(String serialNumber);
    Optional<Atm> findBySerialNumberIgnoreCase(String serialNumber);
    List<Atm> findByLocation(String location);
    List<Atm> findByVendorId(Long vendorId);
    long countByVendorId(Long vendorId);
    long countByAssetStatus(String assetStatus);
    List<Atm> findByAssetStatus(String assetStatus);

    @Query("SELECT DISTINCT a.assetStatus FROM Atm a")
    List<String> findDistinctAssetStatuses();

    @Query("SELECT a FROM Atm a WHERE a.name LIKE %?1% OR a.serialNumber LIKE %?1%")
    List<Atm> searchByNameOrSerial(String keyword);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Atm a WHERE a.uploadedFile.id = ?1")
    int deleteByUploadedFileId(Long uploadedFileId);
}
