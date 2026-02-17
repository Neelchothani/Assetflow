package com.atm.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CostingResponse {
    private Long id;
    private AtmSummary atm;
    private VendorSummary vendor;
    // New mappings: source values come from the ATM row parsed from Excel
    private BigDecimal baseCost; // maps to atm.totalAmount (column N)
    private BigDecimal hold; // maps to atm.hold (column O)
    private BigDecimal deduction; // maps to atm.deduction (column P)
    private BigDecimal finalAmount; // maps to atm.finalAmount (column Q)
    private BigDecimal vendorCost; // maps to atm.vendorCost (column R)
    private String billingStatus; // from atm.billingStatus
    private String billingMonth; // from atm.billingMonth (e.g., "Apr-25")
    private String status;
    private String submittedBy;
    private LocalDate submittedDate;
    private String approvedBy;
    private LocalDate approvedDate;
    private LocalDateTime createdAt;
}