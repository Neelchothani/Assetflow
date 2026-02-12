package com.atm.management.service;

import com.atm.management.dto.request.VendorRequest;
import com.atm.management.dto.response.VendorResponse;
import com.atm.management.exception.ResourceNotFoundException;
import com.atm.management.model.UploadedFile;
import com.atm.management.model.Vendor;
import com.atm.management.repository.AtmRepository;
import com.atm.management.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VendorService {

    private final VendorRepository vendorRepository;
    private final AtmRepository atmRepository;

    @Transactional(readOnly = true)
    public List<VendorResponse> getAllVendors() {
        return vendorRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VendorResponse getVendorById(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + id));
        return mapToResponse(vendor);
    }

    @Transactional(readOnly = true)
    public List<VendorResponse> getVendorsByStatus(String status) {
        Vendor.VendorStatus vendorStatus = Vendor.VendorStatus.valueOf(status.toUpperCase());
        return vendorRepository.findByStatus(vendorStatus)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VendorResponse> searchVendors(String keyword) {
        return vendorRepository.searchByName(keyword)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public VendorResponse createVendor(VendorRequest request) {
        // Check if email already exists (only if email is provided)
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            if (vendorRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new IllegalArgumentException("Vendor with email " + request.getEmail() + " already exists");
            }
        }

        Vendor vendor = new Vendor();
        mapRequestToEntity(request, vendor);
        vendor.setStatus(Vendor.VendorStatus.ACTIVE);
        vendor.setJoinedDate(LocalDate.now());
        vendor.setRating(BigDecimal.ZERO);
        vendor.setAssetsAllocated(0);
        vendor.setActiveSites(0);
        vendor.setTotalCost(BigDecimal.ZERO);

        Vendor savedVendor = vendorRepository.save(vendor);
        return mapToResponse(savedVendor);
    }

    @Transactional
    public VendorResponse updateVendor(Long id, VendorRequest request) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + id));

        // Check email uniqueness if changed
        if (!vendor.getEmail().equals(request.getEmail())) {
            if (vendorRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new IllegalArgumentException("Vendor with email " + request.getEmail() + " already exists");
            }
        }

        mapRequestToEntity(request, vendor);
        Vendor updatedVendor = vendorRepository.save(vendor);
        return mapToResponse(updatedVendor);
    }

    @Transactional
    public VendorResponse updateVendorStatus(Long id, String status) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + id));

        vendor.setStatus(Vendor.VendorStatus.valueOf(status.toUpperCase()));
        Vendor updatedVendor = vendorRepository.save(vendor);
        return mapToResponse(updatedVendor);
    }

    @Transactional
    public VendorResponse updateVendorRating(Long id, Double rating) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + id));

        if (rating < 0.0 || rating > 5.0) {
            throw new IllegalArgumentException("Rating must be between 0.0 and 5.0");
        }

        vendor.setRating(BigDecimal.valueOf(rating));
        Vendor updatedVendor = vendorRepository.save(vendor);
        return mapToResponse(updatedVendor);
    }

    @Transactional
    public List<VendorResponse> createVendorsFromExcel(List<String> vendorNames, UploadedFile uploadedFile) {
        List<VendorResponse> createdVendors = new ArrayList<>();

        for (String vendorName : vendorNames) {
            if (vendorName == null || vendorName.trim().isEmpty()) {
                continue;
            }

            // Check if vendor already exists by name
            Optional<Vendor> existingVendor = vendorRepository.findByNameIgnoreCase(vendorName.trim());

            if (existingVendor.isPresent()) {
                // Vendor exists - for Excel imports with vendor name only, consider it exact duplicate
                Vendor vendor = existingVendor.get();
                createdVendors.add(mapToResponse(vendor));
                continue;
            }

            // Create new vendor
            Vendor vendor = new Vendor();
            vendor.setName(vendorName.trim());
            // Generate unique email for each vendor using name + timestamp
            String uniqueEmail = generateUniqueVendorEmail(vendorName.trim());
            vendor.setEmail(uniqueEmail);
            vendor.setPhone(""); // Placeholder
            vendor.setStatus(Vendor.VendorStatus.ACTIVE);
            vendor.setJoinedDate(LocalDate.now());
            vendor.setRating(BigDecimal.ZERO);
            vendor.setAssetsAllocated(0);
            vendor.setActiveSites(0);
            vendor.setTotalCost(BigDecimal.ZERO);
            // Set the uploaded file reference for cascade delete tracking
            if (uploadedFile != null) {
                vendor.setUploadedFile(uploadedFile);
            }

            Vendor savedVendor = vendorRepository.save(vendor);
            createdVendors.add(mapToResponse(savedVendor));
        }

        return createdVendors;
    }

    @Transactional
    public List<VendorResponse> createVendorsFromExcel(List<String> vendorNames) {
        return createVendorsFromExcel(vendorNames, null);
    }

    /**
     * Check if existing vendor record is an exact duplicate (all data identical)
     * For Excel imports, since we only get the vendor name, exact duplicate check is based on name only
     */
    private boolean isExactDuplicateVendor(Vendor existing, String vendorName) {
        String existingName = existing.getName() != null ? existing.getName().trim() : "";
        String newName = vendorName != null ? vendorName.trim() : "";
        return existingName.equalsIgnoreCase(newName);
    }

    /**
     * Update existing vendor with new data
     * Currently used for future enhancements when more vendor data is available from Excel
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    private void updateExistingVendor(Vendor vendor, String vendorName) {
        // For now, only update the name if different
        if (vendorName != null && !vendorName.isBlank()) {
            vendor.setName(vendorName.trim());
            vendorRepository.save(vendor);
            log.info("✓ Updated vendor: {}", vendor.getName());
        }
    }

    /**
    * Generate unique email for vendors created from Excel
    * Format: vendor-name-timestamp@vendor.com
     */
    private String generateUniqueVendorEmail(String vendorName) {
        String sanitized = vendorName.toLowerCase()
                .replaceAll("[^a-z0-9]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        
        if (sanitized.length() > 30) {
            sanitized = sanitized.substring(0, 30);
        }
        
        long timestamp = System.nanoTime() % 1000000; // Use nanos for uniqueness
        return String.format("%s-%d@vendor.com", sanitized, timestamp);
    }

    @Transactional
    public void deleteVendor(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + id));

        // Check if vendor has any ATMs allocated
        long atmCount = atmRepository.findByVendorId(id).size();
        if (atmCount > 0) {
            throw new IllegalArgumentException("Cannot delete vendor with " + atmCount + " ATMs allocated. Please reassign or remove ATMs first.");
        }

        vendorRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getVendorStatistics() {
        Map<String, Object> stats = new HashMap<>();

        Long totalVendors = vendorRepository.count();
        Long activeVendors = vendorRepository.countActiveVendors();

        List<Vendor> vendors = vendorRepository.findAll();

        int totalAssetsAllocated = vendors.stream()
                .mapToInt(Vendor::getAssetsAllocated)
                .sum();

        double averageRating = vendors.stream()
                .map(Vendor::getRating)
                .mapToDouble(BigDecimal::doubleValue)
                .average()
                .orElse(0.0);

        BigDecimal totalCost = vendors.stream()
                .map(Vendor::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        stats.put("totalVendors", totalVendors);
        stats.put("activeVendors", activeVendors);
        stats.put("inactiveVendors", totalVendors - activeVendors);
        stats.put("totalAssetsAllocated", totalAssetsAllocated);
        stats.put("averageRating", Math.round(averageRating * 10.0) / 10.0);
        stats.put("totalCost", totalCost);

        return stats;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getVendorAtms(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + id));

        List<Map<String, Object>> atms = atmRepository.findByVendorId(id)
                .stream()
                .map(atm -> {
                    Map<String, Object> atmData = new HashMap<>();
                    atmData.put("id", atm.getId());
                    atmData.put("name", atm.getName());
                atmData.put("serialNumber", atm.getSerialNumber());
                atmData.put("status", atm.getAssetStatus());
                atmData.put("location", atm.getLocation());
                    atmData.put("value", atm.getValue());
                    return atmData;
                })
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("vendorName", vendor.getName());
        result.put("atmCount", atms.size());
        result.put("atms", atms);

        return result;
    }

    // Helper methods
    private void mapRequestToEntity(VendorRequest request, Vendor vendor) {
        vendor.setName(request.getName());
        vendor.setEmail(request.getEmail());
        vendor.setPhone(request.getPhone());
        vendor.setAddress(request.getAddress());
        vendor.setContactPerson(request.getContactPerson());
        vendor.setTaxId(request.getTaxId());
        vendor.setContractStartDate(request.getContractStartDate());
        vendor.setContractEndDate(request.getContractEndDate());
        vendor.setNotes(request.getNotes());
        vendor.setFreightCategory(request.getFreightCategory());
    }

    private VendorResponse mapToResponse(Vendor vendor) {
        return new VendorResponse(
                vendor.getId(),
                vendor.getName(),
                vendor.getEmail(),
                vendor.getPhone(),
                vendor.getStatus().name(),
                vendor.getAssetsAllocated(),
                vendor.getActiveSites(),
                vendor.getTotalCost(),
                vendor.getFreightCategory(),
                vendor.getRating(),
                vendor.getJoinedDate(),
                vendor.getContactPerson(),
                vendor.getCreatedAt()
        );
    }
}
