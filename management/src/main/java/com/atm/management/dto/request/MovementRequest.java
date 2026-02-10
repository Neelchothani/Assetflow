package com.atm.management.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MovementRequest {
    @NotNull(message = "ATM ID is required")
    private Long atmId;

    @NotBlank(message = "From location is required")
    private String fromLocation;

    @NotBlank(message = "To location is required")
    private String toLocation;

    @NotNull(message = "Movement type is required")
    private String movementType;

    @NotBlank(message = "Initiated by is required")
    private String initiatedBy;

    @NotNull(message = "Expected delivery date is required")
    private LocalDate expectedDelivery;

    private String notes;

    // Optional additional fields parsed from Excel / frontend
    private String docketNo;
    private String businessGroup;
    private String modeOfBill;
}