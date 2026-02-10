package com.atm.management.service;

import com.atm.management.dto.request.CostingRequest;
import com.atm.management.dto.response.AtmSummary;
import com.atm.management.dto.response.CostingResponse;
import com.atm.management.dto.response.VendorSummary;
import com.atm.management.exception.ResourceNotFoundException;
import com.atm.management.model.Atm;
import com.atm.management.model.Costing;
import com.atm.management.model.Vendor;
import com.atm.management.repository.AtmRepository;
import com.atm.management.repository.CostingRepository;
import com.atm.management.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CostingService {

    private final CostingRepository costingRepository;
    private final AtmRepository atmRepository;
    private final VendorRepository vendorRepository;

    @Transactional(readOnly = true)
    public List<CostingResponse> getAllCostings() {
        return costingRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CostingResponse getCostingById(Long id) {
        Costing costing = costingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Costing not found with id: " + id));
        return mapToResponse(costing);
    }

    @Transactional(readOnly = true)
    public List<CostingResponse> getCostingsByStatus(String status) {
        Costing.CostingStatus costingStatus = Costing.CostingStatus.valueOf(status.toUpperCase());
        return costingRepository.findByStatus(costingStatus)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CostingResponse> getCostingsByAtm(Long atmId) {
        return costingRepository.findByAtmId(atmId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CostingResponse> getCostingsByVendor(Long vendorId) {
        return costingRepository.findByVendorId(vendorId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CostingResponse createCosting(CostingRequest request) {
        Atm atm = atmRepository.findById(request.getAtmId())
                .orElseThrow(() -> new ResourceNotFoundException("ATM not found with id: " + request.getAtmId()));

        Vendor vendor = vendorRepository.findById(request.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + request.getVendorId()));

        Costing costing = new Costing();
        mapRequestToEntity(request, costing, atm, vendor);
        costing.setStatus(Costing.CostingStatus.PENDING);
        costing.setSubmittedDate(LocalDate.now());

        Costing savedCosting = costingRepository.save(costing);
        return mapToResponse(savedCosting);
    }

    @Transactional
    public CostingResponse updateCosting(Long id, CostingRequest request) {
        Costing costing = costingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Costing not found with id: " + id));

        // Only allow updates for pending costings
        if (costing.getStatus() != Costing.CostingStatus.PENDING) {
            throw new IllegalArgumentException("Cannot update costing with status: " + costing.getStatus());
        }

        Atm atm = atmRepository.findById(request.getAtmId())
                .orElseThrow(() -> new ResourceNotFoundException("ATM not found with id: " + request.getAtmId()));

        Vendor vendor = vendorRepository.findById(request.getVendorId())
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found with id: " + request.getVendorId()));

        mapRequestToEntity(request, costing, atm, vendor);
        Costing updatedCosting = costingRepository.save(costing);
        return mapToResponse(updatedCosting);
    }

    @Transactional
    public CostingResponse approveCosting(Long id, String approvedBy) {
        Costing costing = costingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Costing not found with id: " + id));

        if (costing.getStatus() != Costing.CostingStatus.PENDING) {
            throw new IllegalArgumentException("Cannot approve costing with status: " + costing.getStatus());
        }

        costing.setStatus(Costing.CostingStatus.APPROVED);
        costing.setApprovedBy(approvedBy);
        costing.setApprovedDate(LocalDate.now());

        Costing approvedCosting = costingRepository.save(costing);
        return mapToResponse(approvedCosting);
    }

    @Transactional
    public CostingResponse rejectCosting(Long id, String rejectedBy) {
        Costing costing = costingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Costing not found with id: " + id));

        if (costing.getStatus() != Costing.CostingStatus.PENDING) {
            throw new IllegalArgumentException("Cannot reject costing with status: " + costing.getStatus());
        }

        costing.setStatus(Costing.CostingStatus.REJECTED);
        costing.setApprovedBy(rejectedBy); // Store who rejected it
        costing.setApprovedDate(LocalDate.now());

        Costing rejectedCosting = costingRepository.save(costing);
        return mapToResponse(rejectedCosting);
    }

    @Transactional
    public void deleteCosting(Long id) {
        if (!costingRepository.existsById(id)) {
            throw new ResourceNotFoundException("Costing not found with id: " + id);
        }
        costingRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCostingStatistics() {
        Map<String, Object> stats = new HashMap<>();

        Long totalCostings = costingRepository.count();
        Long pendingCostings = costingRepository.countPendingApprovals();

        List<Costing> allCostings = costingRepository.findAll();

        Long approvedCostings = allCostings.stream()
                .filter(c -> c.getStatus() == Costing.CostingStatus.APPROVED)
                .count();

        Long rejectedCostings = allCostings.stream()
                .filter(c -> c.getStatus() == Costing.CostingStatus.REJECTED)
                .count();

        BigDecimal totalPendingValue = allCostings.stream()
                .filter(c -> c.getStatus() == Costing.CostingStatus.PENDING)
                .map(Costing::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalApprovedValue = allCostings.stream()
                .filter(c -> c.getStatus() == Costing.CostingStatus.APPROVED)
                .map(Costing::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Double averageMargin = costingRepository.getAverageMargin();
        if (averageMargin == null) {
            averageMargin = 0.0;
        }

        stats.put("total", totalCostings);
        stats.put("pending", pendingCostings);
        stats.put("approved", approvedCostings);
        stats.put("rejected", rejectedCostings);
        stats.put("totalPendingValue", totalPendingValue);
        stats.put("totalApprovedValue", totalApprovedValue);
        stats.put("averageMargin", Math.round(averageMargin * 10.0) / 10.0);

        return stats;
    }

    // Helper methods
    private void mapRequestToEntity(CostingRequest request, Costing costing, Atm atm, Vendor vendor) {
        costing.setAtm(atm);
        costing.setVendor(vendor);
        costing.setBaseCost(request.getBaseCost());
        costing.setMaintenanceCost(request.getMaintenanceCost());
        costing.setOperationalCost(request.getOperationalCost());
        costing.setMargin(request.getMargin());
        costing.setSubmittedBy(request.getSubmittedBy());
        costing.setNotes(request.getNotes());
        // Total cost is calculated automatically in the @PrePersist and @PreUpdate methods
    }

    private CostingResponse mapToResponse(Costing costing) {
        AtmSummary atmSummary = new AtmSummary(
                costing.getAtm().getId(),
                costing.getAtm().getName(),
                costing.getAtm().getSerialNumber(),
                costing.getAtm().getLocation()
        );

        VendorSummary vendorSummary = new VendorSummary(
            costing.getVendor().getId(),
            costing.getVendor().getName(),
            costing.getVendor().getEmail(),
            costing.getVendor().getPhone()
        );

        // Read ATM-derived costing fields
        BigDecimal baseCostFromAtm = costing.getAtm().getTotalAmount();
        BigDecimal holdFromAtm = costing.getAtm().getHold();
        BigDecimal deductionFromAtm = costing.getAtm().getDeduction();
        BigDecimal finalAmountFromAtm = costing.getAtm().getFinalAmount();
        BigDecimal vendorCostFromAtm = costing.getAtm().getVendorCost();
        String billingStatusFromAtm = costing.getAtm().getBillingStatus();

        return new CostingResponse(
            costing.getId(),
            atmSummary,
            vendorSummary,
                baseCostFromAtm,
                holdFromAtm,
                deductionFromAtm,
                finalAmountFromAtm,
                vendorCostFromAtm,
                billingStatusFromAtm,
            costing.getStatus().name(),
            costing.getSubmittedBy(),
            costing.getSubmittedDate(),
            costing.getApprovedBy(),
            costing.getApprovedDate(),
            costing.getCreatedAt()
        );
    }
}