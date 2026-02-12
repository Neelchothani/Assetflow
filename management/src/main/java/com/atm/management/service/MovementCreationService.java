package com.atm.management.service;

import com.atm.management.model.Atm;
import com.atm.management.model.Movement;
import com.atm.management.model.EmailRecipient;
import com.atm.management.model.UploadedFile;
import com.atm.management.repository.AtmRepository;
import com.atm.management.repository.MovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service to automatically create movements from Excel data
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MovementCreationService {

    private final MovementRepository movementRepository;
    private final AtmRepository atmRepository;

    /**
     * Create movements from parsed Excel email recipients
     * Automatically links to ATMs based on BNA ID
     */
    public Map<String, Object> createMovementsFromExcelData(List<EmailRecipient> recipients, UploadedFile uploadedFile) {
        Map<String, Object> result = new HashMap<>();
        List<String> createdMovements = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        List<Movement> movementBatch = new ArrayList<>();
        final int BATCH_SIZE = 50; // Save movements in batches for better performance

        if (recipients == null || recipients.isEmpty()) {
            result.put("success", false);
            result.put("message", "No recipient data provided");
            return result;
        }

        for (EmailRecipient recipient : recipients) {
            String atmBnaId = null;
            try {
                // Extract movement details
                atmBnaId = recipient.getAtmBnaId();
                String movementTypeStr = recipient.getTypeOfMovement();
                String fromLocation = recipient.getFromLocation();
                String toLocation = recipient.getToLocation();

                if (atmBnaId == null || atmBnaId.trim().isEmpty()) {
                    skipped.add("Row: Missing ATM BNA ID");
                    continue;
                }

                if (movementTypeStr == null || movementTypeStr.trim().isEmpty()) {
                    skipped.add("ATM " + atmBnaId + ": Missing movement type");
                    continue;
                }

                // Find the ATM by serial number (case-insensitive, using repository method)
                Optional<Atm> atmOptional = atmRepository.findBySerialNumberIgnoreCase(atmBnaId.trim());

                if (!atmOptional.isPresent()) {
                    skipped.add("ATM " + atmBnaId + ": ATM not found in database");
                    log.warn("ATM not found: {} - skipping movement creation", atmBnaId);
                    continue;
                }

                Atm atm = atmOptional.get();

                // Check if movement already exists for this ATM
                Optional<Movement> existingMovement = movementRepository.findAll().stream()
                        .filter(m -> m.getAtm().getId().equals(atm.getId()) 
                                && m.getStatus() != Movement.MovementStatus.CANCELLED)
                        .findFirst();

                if (existingMovement.isPresent()) {
                    // Movement exists - check if data is identical or different
                    Movement existingMvmt = existingMovement.get();
                    boolean isDuplicate = isExactDuplicateMovement(existingMvmt, movementTypeStr, fromLocation, toLocation, recipient);
                    
                    if (isDuplicate) {
                        // Skip if all data is identical
                        skipped.add("Movement for ATM " + atmBnaId + " already exists with identical data");
                        continue;
                    } else {
                        // Update existing movement with new data
                        updateExistingMovement(existingMvmt, movementTypeStr, fromLocation, toLocation, recipient, uploadedFile, atmBnaId);
                        createdMovements.add("Movement: " + movementTypeStr + " for ATM " + atmBnaId + " (Updated with new data)");
                        continue;
                    }
                }

                // Create new movement
                Movement movement = new Movement();
                movement.setAtm(atm);
                movement.setUploadedFile(uploadedFile);
                movement.setMovementType(movementTypeStr != null ? movementTypeStr.trim() : "Unknown");
                movement.setFromLocation(fromLocation != null ? fromLocation : "Unknown");
                movement.setToLocation(toLocation != null ? toLocation : "Unknown");
                movement.setStatus(Movement.MovementStatus.PENDING);
                movement.setInitiatedBy("System");
                movement.setInitiatedDate(LocalDate.now());
                movement.setExpectedDelivery(LocalDate.now().plusDays(7)); // Default 7 days
                movement.setNotes("Auto-created from Excel: " + recipient.getAssetsServiceDescription());
                movement.setDocketNo(recipient.getDocketNo());
                movement.setBusinessGroup(recipient.getBusinessGroup());
                movement.setModeOfBill(recipient.getModeOfBill());

                // Batch movements for better performance
                movementBatch.add(movement);
                if (movementBatch.size() >= BATCH_SIZE) {
                    saveMovementBatch(movementBatch, createdMovements);
                    movementBatch.clear();
                }

            } catch (Exception e) {
                String errorMsg = "Error creating movement for ATM " + atmBnaId + ": " + e.getMessage();
                errors.add(errorMsg);
                log.error(errorMsg, e);
            }
        }

        // Save remaining movements in batch
        if (!movementBatch.isEmpty()) {
            saveMovementBatch(movementBatch, createdMovements);
        }

        result.put("success", errors.isEmpty());
        result.put("totalProcessed", recipients.size());
        result.put("movementsCreated", createdMovements.size());
        result.put("errors", errors.size());
        result.put("skipped", skipped.size());
        result.put("createdMovements", createdMovements);
        result.put("errorDetails", errors);
        result.put("skippedDetails", skipped);
        result.put("message", String.format("✓ Created %d movements, %d skipped, %d errors", 
                createdMovements.size(), skipped.size(), errors.size()));

        return result;
    }

    /**
     * Save ONE movement in its own transaction
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveSingleMovement(Movement movement, String atmBnaId, List<String> createdMovements) {
        try {
            Movement savedMovement = movementRepository.save(movement);
            createdMovements.add("Movement: " + movement.getMovementType() + " for ATM " + atmBnaId + 
                    " (Tracking: " + savedMovement.getTrackingNumber() + ")");
            log.info("✓ Created movement: {} for ATM {}", movement.getMovementType(), atmBnaId);
        } catch (Exception e) {
            log.error("Failed to save movement for ATM {}: {}", atmBnaId, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Save batch of movements in one transaction for better performance
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveMovementBatch(List<Movement> movements, List<String> createdMovements) {
        try {
            List<Movement> savedMovements = movementRepository.saveAll(movements);
            for (Movement movement : savedMovements) {
                createdMovements.add("Movement: " + movement.getMovementType() + 
                        " (Tracking: " + movement.getTrackingNumber() + ")");
            }
            log.debug("Saved batch of {} movements", movements.size());
        } catch (Exception e) {
            log.error("Failed to save movement batch: {}", e.getMessage());
        }
    }

    /**
     * Parse movement type from string
     */
    private Movement.MovementType parseMovementType(String typeStr) {
        if (typeStr == null) {
            return Movement.MovementType.RELOCATION;
        }

        String normalized = typeStr.trim().toUpperCase();

        if (normalized.contains("INSTALL")) {
            return Movement.MovementType.INSTALLATION;
        } else if (normalized.contains("RELOCAT")) {
            return Movement.MovementType.RELOCATION;
        } else if (normalized.contains("MAINT")) {
            return Movement.MovementType.MAINTENANCE;
        } else if (normalized.contains("DECOMMISSION")) {
            return Movement.MovementType.DECOMMISSION;
        } else if (normalized.contains("RETURN")) {
            return Movement.MovementType.RETURN;
        }

        return Movement.MovementType.RELOCATION; // Default
    }

    /**
     * Check if existing movement record is an exact duplicate (all data identical)
     */
    private boolean isExactDuplicateMovement(Movement existing, String newMovementType, String newFromLocation, 
                                              String newToLocation, EmailRecipient recipient) {
        // Compare key movement fields
        // If any field differs, it's not a duplicate
        
        // Compare movement type
        String existingType = existing.getMovementType() != null ? existing.getMovementType().trim() : "";
        String newType = newMovementType != null ? newMovementType.trim() : "Unknown";
        if (!existingType.equalsIgnoreCase(newType)) {
            return false;
        }
        
        // Compare from location
        String existingFrom = existing.getFromLocation() != null ? existing.getFromLocation().trim() : "";
        String newFrom = newFromLocation != null ? newFromLocation.trim() : "Unknown";
        if (!existingFrom.equalsIgnoreCase(newFrom)) {
            return false;
        }
        
        // Compare to location
        String existingTo = existing.getToLocation() != null ? existing.getToLocation().trim() : "";
        String newTo = newToLocation != null ? newToLocation.trim() : "Unknown";
        if (!existingTo.equalsIgnoreCase(newTo)) {
            return false;
        }
        
        // Compare docket number
        String existingDocket = existing.getDocketNo() != null ? existing.getDocketNo().trim() : "";
        String newDocket = recipient.getDocketNo() != null ? recipient.getDocketNo().trim() : "";
        if (!existingDocket.equalsIgnoreCase(newDocket)) {
            return false;
        }
        
        // Compare business group
        String existingBg = existing.getBusinessGroup() != null ? existing.getBusinessGroup().trim() : "";
        String newBg = recipient.getBusinessGroup() != null ? recipient.getBusinessGroup().trim() : "";
        if (!existingBg.equalsIgnoreCase(newBg)) {
            return false;
        }
        
        // All key fields match - this is an exact duplicate
        return true;
    }

    /**
     * Update existing movement with new data from Excel
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    private void updateExistingMovement(Movement movement, String movementType, String fromLocation, 
                                         String toLocation, EmailRecipient recipient, UploadedFile uploadedFile, String atmBnaId) {
        movement.setMovementType(movementType != null ? movementType.trim() : "Unknown");
        movement.setFromLocation(fromLocation != null ? fromLocation : "Unknown");
        movement.setToLocation(toLocation != null ? toLocation : "Unknown");
        movement.setExpectedDelivery(LocalDate.now().plusDays(7)); // Reset delivery date
        movement.setNotes("Updated from Excel: " + recipient.getAssetsServiceDescription());
        movement.setDocketNo(recipient.getDocketNo());
        movement.setBusinessGroup(recipient.getBusinessGroup());
        movement.setModeOfBill(recipient.getModeOfBill());
        movement.setUploadedFile(uploadedFile);
        
        movementRepository.save(movement);
        log.info("✓ Updated movement for ATM: {}", atmBnaId);
    }

    /**
     * Get movement statistics for a specific ATM
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getAtmMovementsStatistics(Long atmId) {
        Map<String, Object> stats = new HashMap<>();
        
        List<Movement> movements = movementRepository.findAll().stream()
                .filter(m -> m.getAtm().getId().equals(atmId))
                .collect(Collectors.toList());

        stats.put("totalMovements", movements.size());
        stats.put("pendingMovements", movements.stream().filter(m -> m.getStatus() == Movement.MovementStatus.PENDING).count());
        stats.put("inTransitMovements", movements.stream().filter(m -> m.getStatus() == Movement.MovementStatus.IN_TRANSIT).count());
        stats.put("deliveredMovements", movements.stream().filter(m -> m.getStatus() == Movement.MovementStatus.DELIVERED).count());
        stats.put("cancelledMovements", movements.stream().filter(m -> m.getStatus() == Movement.MovementStatus.CANCELLED).count());
        
        return stats;
    }

    /**
     * Update movement status
     */
    @Transactional
    public void updateMovementStatus(Long movementId, String status) {
        Optional<Movement> movement = movementRepository.findById(movementId);
        if (movement.isPresent()) {
            Movement m = movement.get();
            try {
                m.setStatus(Movement.MovementStatus.valueOf(status.toUpperCase()));
                if (status.equalsIgnoreCase("DELIVERED")) {
                    m.setActualDelivery(LocalDate.now());
                }
                movementRepository.save(m);
            } catch (IllegalArgumentException e) {
                log.error("Invalid movement status: {}", status);
            }
        }
    }
}
