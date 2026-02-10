package com.atm.management.service;

import com.atm.management.dto.request.AtmRequest;
import com.atm.management.dto.response.AtmResponse;
import com.atm.management.dto.response.VendorSummary;
import com.atm.management.exception.ResourceNotFoundException;
import com.atm.management.model.Atm;
import com.atm.management.model.Vendor;
import com.atm.management.repository.AtmRepository;
import com.atm.management.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AtmService {

    private final AtmRepository atmRepository;
    private final VendorRepository vendorRepository;

    @Transactional(readOnly = true)
    public List<AtmResponse> getAllAtms() {
        return atmRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AtmResponse getAtmById(Long id) {
        Atm atm = atmRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ATM not found with id: " + id));
        return mapToResponse(atm);
    }

    @Transactional(readOnly = true)
    public List<AtmResponse> searchAtms(String keyword) {
        return atmRepository.searchByNameOrSerial(keyword)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AtmResponse createAtm(AtmRequest request) {
        // Validate required fields for creation
        if (request.getName() == null || request.getName().isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        if (request.getSerialNumber() == null || request.getSerialNumber().isBlank()) {
            throw new IllegalArgumentException("Serial number is required");
        }
        if (request.getLocation() == null || request.getLocation().isBlank()) {
            throw new IllegalArgumentException("Location is required");
        }
        if (request.getValue() == null) {
            throw new IllegalArgumentException("Value is required");
        }
        if (request.getPurchaseDate() == null) {
            throw new IllegalArgumentException("Purchase date is required");
        }

        // Check if serial number already exists
        if (atmRepository.findBySerialNumber(request.getSerialNumber()).isPresent()) {
            throw new IllegalArgumentException("ATM with serial number " +
                    request.getSerialNumber() + " already exists");
        }

        Atm atm = new Atm();
        mapRequestToEntity(request, atm);
        // Only set default if assetStatus is not provided
        if (atm.getAssetStatus() == null || atm.getAssetStatus().isBlank()) {
            atm.setAssetStatus("Unknown");
        }

        Atm savedAtm = atmRepository.save(atm);
        return mapToResponse(savedAtm);
    }

    @Transactional
    public AtmResponse updateAtm(Long id, AtmRequest request) {
        Atm atm = atmRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ATM not found with id: " + id));

        // Check serial number uniqueness if changed
        if (!atm.getSerialNumber().equals(request.getSerialNumber())) {
            if (atmRepository.findBySerialNumber(request.getSerialNumber()).isPresent()) {
                throw new IllegalArgumentException("ATM with serial number " +
                        request.getSerialNumber() + " already exists");
            }
        }

        mapRequestToEntity(request, atm);
        Atm updatedAtm = atmRepository.save(atm);
        return mapToResponse(updatedAtm);
    }

    @Transactional
    public void deleteAtm(Long id) {
        if (!atmRepository.existsById(id)) {
            throw new ResourceNotFoundException("ATM not found with id: " + id);
        }
        atmRepository.deleteById(id);
    }

    @Transactional
    public AtmResponse updateAtmStatus(Long id, String status) {
        Atm atm = atmRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ATM not found with id: " + id));

        atm.setAssetStatus(status);
        Atm updatedAtm = atmRepository.save(atm);
        return mapToResponse(updatedAtm);
    }

    @Transactional(readOnly = true)
    public List<AtmResponse> getAtmsByStatus(String status) {
        return atmRepository.findByAssetStatus(status)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // Helper methods
    private void mapRequestToEntity(AtmRequest request, Atm atm) {
        atm.setName(request.getName());
        atm.setSerialNumber(request.getSerialNumber());
        atm.setLocation(request.getLocation());
        atm.setBranch(request.getBranch());
        atm.setValue(request.getValue());
        atm.setInstallationDate(request.getInstallationDate());
        atm.setManufacturer(request.getManufacturer());
        atm.setModel(request.getModel());
        atm.setCashCapacity(request.getCashCapacity());
        atm.setNotes(request.getNotes());
        atm.setAssetStatus(request.getAssetStatus());
        atm.setBillingMonth(request.getBillingMonth());
        atm.setBillingStatus(request.getBillingStatus());
        atm.setPickupDate(request.getPickupDate());

        if (request.getVendorId() != null) {
            Vendor vendor = vendorRepository.findById(request.getVendorId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Vendor not found with id: " + request.getVendorId()));
            atm.setVendor(vendor);
        }
    }

    private AtmResponse mapToResponse(Atm atm) {
        VendorSummary vendorSummary = null;
        if (atm.getVendor() != null) {
            vendorSummary = new VendorSummary(
                    atm.getVendor().getId(),
                    atm.getVendor().getName(),
                    atm.getVendor().getEmail()
            );
        }

        return new AtmResponse(
                atm.getId(),
                atm.getName(),
                atm.getSerialNumber(),
                atm.getAssetStatus(),
                atm.getLocation(),
                atm.getBranch(),
                vendorSummary,
                atm.getValue(),
                atm.getBillingMonth(),
                atm.getInstallationDate(),
                atm.getLastMaintenanceDate(),
                atm.getBillingStatus(),
                atm.getPickupDate(),
                atm.getManufacturer(),
                atm.getModel(),
                atm.getCashCapacity(),
                atm.getCurrentCashBalance(),
                atm.getTransactionCount(),
                atm.getNotes(),
                atm.getCreatedAt()
        );
    }
}
