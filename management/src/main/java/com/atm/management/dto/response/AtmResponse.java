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
public class AtmResponse {
    private Long id;
    private String name;
    private String serialNumber;
    private String assetStatus;
    private String location;
    private String branch;
    private VendorSummary vendor;
    private BigDecimal value;
    private String billingMonth;
    private LocalDate installationDate;
    private LocalDate lastMaintenanceDate;
    private String billingStatus;
    private LocalDate pickupDate;
    private String manufacturer;
    private String model;
    private BigDecimal cashCapacity;
    private BigDecimal currentCashBalance;
    private Integer transactionCount;
    private String notes;
    private LocalDateTime createdAt;
}