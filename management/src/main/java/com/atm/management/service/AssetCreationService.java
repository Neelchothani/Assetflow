package com.atm.management.service;

import com.atm.management.model.Atm;
import com.atm.management.model.Vendor;
import com.atm.management.model.EmailRecipient;
import com.atm.management.model.UploadedFile;
import com.atm.management.repository.AtmRepository;
import com.atm.management.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Service to automatically create ATMs (assets) from Excel data
 * SAFE: One transaction per row
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AssetCreationService {

    private final AtmRepository atmRepository;
    private final VendorRepository vendorRepository;
    private final com.atm.management.repository.CostingRepository costingRepository;

    /**
     * Entry method — NOT transactional on purpose
     * One bad row must NOT poison others
     */
    public Map<String, Object> createAssetsFromExcelData(
            List<EmailRecipient> recipients,
            UploadedFile uploadedFile
    ) {
        Map<String, Object> result = new HashMap<>();
        List<String> createdAssets = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        List<com.atm.management.model.Costing> costingBatch = new ArrayList<>();
        final int BATCH_SIZE = 50; // Save costings in batches for better performance

        if (recipients == null || recipients.isEmpty()) {
            result.put("success", false);
            result.put("message", "No recipient data provided");
            return result;
        }

        for (EmailRecipient recipient : recipients) {
            String atmSerialNumber = null;

            try {
                atmSerialNumber = recipient.getAtmBnaId();

                if (atmSerialNumber == null || atmSerialNumber.isBlank()) {
                    skipped.add("Skipped row: missing ATM BNA ID");
                    continue;
                }

                atmSerialNumber = atmSerialNumber.trim();

                Vendor vendor = findOrCreateVendor(recipient.getVendorName());

                // Check for existing ATM with same serial number
                var existingAtmOptional = atmRepository.findBySerialNumberIgnoreCase(atmSerialNumber);
                
                if (existingAtmOptional.isPresent()) {
                    // ATM exists - check if data is identical or different
                    Atm existingAtm = existingAtmOptional.get();
                    boolean isDuplicate = isExactDuplicate(existingAtm, recipient, vendor);
                    
                    if (isDuplicate) {
                        // Skip if all data is identical
                        skipped.add("ATM " + atmSerialNumber + " already exists with identical data");
                        continue;
                    } else {
                        // Update existing ATM if data differs
                        updateExistingAtm(existingAtm, recipient, vendor, uploadedFile);
                        createdAssets.add("ATM-" + atmSerialNumber + " (Updated with new data from Vendor: " + vendor.getName() + ")");
                        log.info("ATM updated with new data: {}", atmSerialNumber);
                        continue;
                    }
                }

                // If freight category present on the row and vendor doesn't have it, set it
                if ((vendor.getFreightCategory() == null || vendor.getFreightCategory().isBlank())
                        && recipient.getFreightCategory() != null && !recipient.getFreightCategory().isBlank()) {
                    vendor.setFreightCategory(recipient.getFreightCategory());
                    vendorRepository.save(vendor);
                }

                Atm atm = buildAtmEntity(recipient, atmSerialNumber, vendor, uploadedFile);

                // Save in a NEW transaction
                saveSingleAtm(atm);

                // Create a Costing record for this ATM so Costing page shows data
                try {
                    com.atm.management.model.Costing costing = new com.atm.management.model.Costing();
                    costing.setAtm(atm);
                    costing.setVendor(vendor);
                    // Map ATM-derived fields into costing entity for visibility
                    costing.setBaseCost(atm.getTotalAmount() != null ? atm.getTotalAmount() : java.math.BigDecimal.ZERO);
                    costing.setMaintenanceCost(atm.getHold() != null ? atm.getHold() : java.math.BigDecimal.ZERO);
                    costing.setOperationalCost(atm.getDeduction() != null ? atm.getDeduction() : java.math.BigDecimal.ZERO);
                    costing.setMargin(java.math.BigDecimal.ZERO);
                    costing.setTotalCost(atm.getFinalAmount() != null ? atm.getFinalAmount() : java.math.BigDecimal.ZERO);
                    costing.setStatus(com.atm.management.model.Costing.CostingStatus.PENDING);
                    costing.setSubmittedBy("system");
                    costing.setSubmittedDate(java.time.LocalDate.now());
                    costing.setNotes(recipient.getAssetsServiceDescription());
                    
                    // Batch costings for better performance
                    costingBatch.add(costing);
                    if (costingBatch.size() >= BATCH_SIZE) {
                        saveCostingBatch(costingBatch);
                        costingBatch.clear();
                    }
                } catch (Exception e) {
                    log.warn("Failed to create costing for ATM {}: {}", atmSerialNumber, e.getMessage());
                }

                updateVendorAssetCount(vendor);

                createdAssets.add("ATM-" + atmSerialNumber + " (Vendor: " + vendor.getName() + ")");
                log.info("ATM created successfully: {}", atmSerialNumber);

            } catch (Exception e) {
                String errorMsg = "ATM " + (atmSerialNumber != null ? atmSerialNumber : "UNKNOWN")
                        + " failed: " + e.getMessage();
                errors.add(errorMsg);
                log.error(errorMsg, e);
            }
        }

        // Save remaining costings in batch
        if (!costingBatch.isEmpty()) {
            saveCostingBatch(costingBatch);
        }

        result.put("success", errors.isEmpty());
        result.put("totalProcessed", recipients.size());
        result.put("assetsCreated", createdAssets.size());
        result.put("skipped", skipped.size());
        result.put("errors", errors.size());
        result.put("createdAssets", createdAssets);
        result.put("skippedDetails", skipped);
        result.put("errorDetails", errors);
        result.put(
                "message",
                String.format(
                        "Created %d assets, %d skipped, %d errors",
                        createdAssets.size(),
                        skipped.size(),
                        errors.size()
                )
        );

        return result;
    }

    /**
     * Saves ONE ATM in its own transaction
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveSingleAtm(Atm atm) {
        atmRepository.save(atm);
    }

    /**
     * Save batch of costings in one transaction for better performance
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveCostingBatch(List<com.atm.management.model.Costing> costings) {
        try {
            costingRepository.saveAll(costings);
            log.debug("Saved batch of {} costings", costings.size());
        } catch (Exception e) {
            log.error("Failed to save costing batch: {}", e.getMessage());
        }
    }

    /**
     * Build ATM entity from Excel data
     */
    private Atm buildAtmEntity(
            EmailRecipient recipient,
            String serialNumber,
            Vendor vendor,
            UploadedFile uploadedFile
    ) {
        Atm atm = new Atm();

        atm.setName("ATM-" + serialNumber);
        atm.setSerialNumber(serialNumber);
        atm.setLocation(
                recipient.getFromLocation() != null
                        ? recipient.getFromLocation()
                        : "Unknown"
        );
        atm.setBranch(recipient.getFromState());
        atm.setVendor(vendor);
        atm.setUploadedFile(uploadedFile);

        // Use status field (Column X) for asset_status - contains company-specific status
        atm.setAssetStatus(
                recipient.getStatus() != null && !recipient.getStatus().isBlank()
                        ? recipient.getStatus()
                        : "Unknown"
        );

        atm.setManufacturer("Standard");
        atm.setModel("Model-Unknown");
        atm.setTransactionCount(0);
        atm.setCurrentCashBalance(BigDecimal.ZERO);

        atm.setBillingMonth(
                recipient.getBillingMonth() != null && !recipient.getBillingMonth().isBlank()
                        ? recipient.getBillingMonth()
                        : "N/A"
        );

        atm.setBillingStatus(
                recipient.getBilling() != null && !recipient.getBilling().isBlank()
                        ? recipient.getBilling()
                        : "PENDING"
        );

        if (recipient.getPickUpDate() != null && !recipient.getPickUpDate().isBlank()) {
            try {
                atm.setPickupDate(LocalDate.parse(recipient.getPickUpDate()));
            } catch (Exception e) {
                log.warn("Invalid pickup date: {}", recipient.getPickUpDate());
            }
        }

        // Populate cost fields from Excel row
        Double totalCost = recipient.getTotalCost(); // Column N
        Double hold = recipient.getHold();           // Column O
        Double deduction = recipient.getDeduction(); // Column P
        Double finalAmt = recipient.getFinalAmount(); // Column Q
        Double perAsset = recipient.getPerAssetCost(); // Column R

        atm.setTotalAmount(totalCost != null ? BigDecimal.valueOf(totalCost) : BigDecimal.ZERO);
        atm.setHold(hold != null ? BigDecimal.valueOf(hold) : BigDecimal.ZERO);
        atm.setDeduction(deduction != null ? BigDecimal.valueOf(deduction) : BigDecimal.ZERO);
        atm.setFinalAmount(finalAmt != null ? BigDecimal.valueOf(finalAmt) : BigDecimal.ZERO);
        atm.setVendorCost(perAsset != null ? BigDecimal.valueOf(perAsset) : BigDecimal.ZERO);

        // Set `value` from totalCost (Column N) as primary, fallback to vendorCost (Column R)
        if (totalCost != null && totalCost > 0) {
            atm.setValue(BigDecimal.valueOf(totalCost));
        } else if (perAsset != null && perAsset > 0) {
            atm.setValue(BigDecimal.valueOf(perAsset));
        } else {
            atm.setValue(BigDecimal.ZERO);
        }

        atm.setInstallationDate(LocalDate.now());
        atm.setNotes("Auto-created from Excel: " + recipient.getAssetsServiceDescription());
        atm.setStatus("ACTIVE");

        return atm;
    }

    /**
     * Find vendor by name or create one
     */
    private Vendor findOrCreateVendor(String vendorName) {
        String finalName =
                (vendorName == null || vendorName.isBlank())
                        ? "Default Vendor"
                        : vendorName.trim();

        return vendorRepository.findByNameIgnoreCase(finalName)
                .orElseGet(() -> {
                    Vendor vendor = new Vendor();
                    vendor.setName(finalName);
                    vendor.setEmail(generateUniqueVendorEmail(finalName));
                    vendor.setPhone("");
                    vendor.setStatus(Vendor.VendorStatus.ACTIVE);
                    vendor.setJoinedDate(LocalDate.now());
                    vendor.setRating(BigDecimal.ZERO);
                    vendor.setAssetsAllocated(0);
                    vendor.setActiveSites(0);
                    vendor.setTotalCost(BigDecimal.ZERO);
                    return vendorRepository.save(vendor);
                });
    }

    /**
     * Generate unique vendor email
     */
    private String generateUniqueVendorEmail(String vendorName) {
        String sanitized = vendorName.toLowerCase()
                .replaceAll("[^a-z0-9]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");

        if (sanitized.length() > 30) {
            sanitized = sanitized.substring(0, 30);
        }

        return sanitized + "-" + System.nanoTime() % 1_000_000 + "@vendor.com";
    }

    /**
     * Update vendor asset count safely
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateVendorAssetCount(Vendor vendor) {
        long count = atmRepository.countByVendorId(vendor.getId());
        vendor.setAssetsAllocated((int) count);
        // Also update vendor totalCost by summing ATM values
        List<Atm> atms = atmRepository.findByVendorId(vendor.getId());
        java.math.BigDecimal sum = atms.stream()
                .map(Atm::getValue)
                .filter(Objects::nonNull)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        vendor.setTotalCost(sum);
        vendorRepository.save(vendor);
    }

    /**
     * Check if existing ATM record is an exact duplicate (all data identical)
     */
    private boolean isExactDuplicate(Atm existing, EmailRecipient newData, Vendor vendor) {
        // Compare key fields to determine if this is a duplicate or an update
        // If any field differs, it's not a duplicate
        
        // Compare location
        String existingLocation = existing.getLocation() != null ? existing.getLocation().trim() : "";
        String newLocation = newData.getFromLocation() != null ? newData.getFromLocation().trim() : "";
        if (!existingLocation.equalsIgnoreCase(newLocation)) {
            return false;
        }

        // Compare vendor
        Long existingVendorId = existing.getVendor() != null ? existing.getVendor().getId() : null;
        Long newVendorId = vendor.getId();
        if (!java.util.Objects.equals(existingVendorId, newVendorId)) {
            return false;
        }

        // Compare total cost (value)
        Double newTotalCost = newData.getTotalCost();
        if (newTotalCost != null) {
            if (existing.getValue() == null || !existing.getValue().equals(java.math.BigDecimal.valueOf(newTotalCost))) {
                return false;
            }
        }

        // Compare billing month
        String existingBillingMonth = existing.getBillingMonth() != null ? existing.getBillingMonth().trim() : "";
        String newBillingMonth = newData.getBillingMonth() != null ? newData.getBillingMonth().trim() : "";
        if (!existingBillingMonth.equalsIgnoreCase(newBillingMonth)) {
            return false;
        }

        // Compare billing status
        String existingBillingStatus = existing.getBillingStatus() != null ? existing.getBillingStatus().trim() : "";
        String newBillingStatus = newData.getBilling() != null ? newData.getBilling().trim() : "";
        if (!existingBillingStatus.equalsIgnoreCase(newBillingStatus)) {
            return false;
        }

        // All key fields match - this is an exact duplicate
        return true;
    }

    /**
     * Update existing ATM with new data from Excel
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    private void updateExistingAtm(Atm atm, EmailRecipient recipient, Vendor vendor, UploadedFile uploadedFile) {
        // Update fields that may have changed
        
        // Update location if different
        if (recipient.getFromLocation() != null && !recipient.getFromLocation().isBlank()) {
            atm.setLocation(recipient.getFromLocation());
        }

        // Update vendor if different
        if (vendor.getId() != null && !java.util.Objects.equals(atm.getVendor().getId(), vendor.getId())) {
            atm.setVendor(vendor);
        }

        // Update cost fields
        Double totalCost = recipient.getTotalCost();
        Double hold = recipient.getHold();
        Double deduction = recipient.getDeduction();
        Double finalAmt = recipient.getFinalAmount();
        Double perAsset = recipient.getPerAssetCost();

        if (totalCost != null && totalCost > 0) {
            atm.setValue(java.math.BigDecimal.valueOf(totalCost));
        } else if (perAsset != null && perAsset > 0) {
            atm.setValue(java.math.BigDecimal.valueOf(perAsset));
        }

        atm.setTotalAmount(totalCost != null ? java.math.BigDecimal.valueOf(totalCost) : java.math.BigDecimal.ZERO);
        atm.setHold(hold != null ? java.math.BigDecimal.valueOf(hold) : java.math.BigDecimal.ZERO);
        atm.setDeduction(deduction != null ? java.math.BigDecimal.valueOf(deduction) : java.math.BigDecimal.ZERO);
        atm.setFinalAmount(finalAmt != null ? java.math.BigDecimal.valueOf(finalAmt) : java.math.BigDecimal.ZERO);
        atm.setVendorCost(perAsset != null ? java.math.BigDecimal.valueOf(perAsset) : java.math.BigDecimal.ZERO);

        // Update billing info
        if (recipient.getBillingMonth() != null && !recipient.getBillingMonth().isBlank()) {
            atm.setBillingMonth(recipient.getBillingMonth());
        }

        if (recipient.getBilling() != null && !recipient.getBilling().isBlank()) {
            atm.setBillingStatus(recipient.getBilling());
        }

        // Update pickup date if provided
        if (recipient.getPickUpDate() != null && !recipient.getPickUpDate().isBlank()) {
            try {
                atm.setPickupDate(LocalDate.parse(recipient.getPickUpDate()));
            } catch (Exception e) {
                log.warn("Invalid pickup date: {}", recipient.getPickUpDate());
            }
        }

        // Save updated ATM
        atmRepository.save(atm);
    }
}
