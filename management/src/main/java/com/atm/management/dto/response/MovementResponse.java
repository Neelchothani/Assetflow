package com.atm.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MovementResponse {
    private Long id;
    private AtmSummary atm;
    private String assetName;
    private Long assetId;
    private String fromLocation;
    private String toLocation;
    private String movementType;
    private String status;
    private String initiatedBy;
    private LocalDate initiatedDate;
    private LocalDate expectedDelivery;
    private LocalDate actualDelivery;
    private String trackingNumber;
    private LocalDateTime createdAt;
    private String docketNo;
    private String businessGroup;
    private String modeOfBill;
}