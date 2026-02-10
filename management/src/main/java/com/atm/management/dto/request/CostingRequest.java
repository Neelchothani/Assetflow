package com.atm.management.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CostingRequest {
    @NotNull(message = "ATM ID is required")
    private Long atmId;

    @NotNull(message = "Vendor ID is required")
    private Long vendorId;

    @NotNull(message = "Base cost is required")
    @DecimalMin("0.0")
    private BigDecimal baseCost;

    @NotNull(message = "Maintenance cost is required")
    @DecimalMin("0.0")
    private BigDecimal maintenanceCost;

    @NotNull(message = "Operational cost is required")
    @DecimalMin("0.0")
    private BigDecimal operationalCost;

    @NotNull(message = "Margin is required")
    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private BigDecimal margin;

    @NotBlank(message = "Submitted by is required")
    private String submittedBy;

    private String notes;
}