package com.atm.management.repository;

import com.atm.management.model.Movement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MovementRepository extends JpaRepository<Movement, Long> {
    List<Movement> findByStatus(Movement.MovementStatus status);
    List<Movement> findByAtmId(Long atmId);
    List<Movement> findByMovementType(Movement.MovementType movementType);

    @Query("SELECT m FROM Movement m WHERE m.initiatedDate BETWEEN ?1 AND ?2")
    List<Movement> findByDateRange(LocalDate startDate, LocalDate endDate);

    @Query("SELECT COUNT(m) FROM Movement m WHERE m.status = ?1")
    Long countByStatus(Movement.MovementStatus status);

    @Query("SELECT m FROM Movement m ORDER BY m.initiatedDate DESC")
    List<Movement> findRecentMovements();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Movement m WHERE m.uploadedFile.id = ?1")
    int deleteByUploadedFileId(Long uploadedFileId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM Movement m WHERE m.atm.uploadedFile.id = ?1 OR m.uploadedFile.id = ?1")
    int deleteByAtmUploadedFileId(Long uploadedFileId);
}