package com.atm.management.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AtmRequest {
    @Size(max = 200)
    private String name;

    @Size(max = 100)
    private String serialNumber;

    @Size(max = 200)
    private String location;

    private String branch;
    private Long vendorId;

    private BigDecimal value;
    private LocalDate purchaseDate;

    private LocalDate installationDate;
    private String manufacturer;
    private String model;
    private BigDecimal cashCapacity;
    private String notes;
    private String assetStatus;
    private String billingMonth;
    private String billingStatus;
    private LocalDate pickupDate;
    private LocalDate deliveryDate;
    private String amountReceived;
}