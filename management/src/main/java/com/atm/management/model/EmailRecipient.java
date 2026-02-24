package com.atm.management.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailRecipient {
    private Integer sNo;
    private String provisionMonth;
    private String atmBnaId;
    private String docketNo;
    private String bankName;
    private String fromLocation;
    private String fromState;
    private String toLocation;
    private String toState;
    private String businessGroup;
    private String modeOfBill;
    private String typeOfMovement;
    private String assetsServiceDescription;
    private Double totalCost;
    private Double perAssetCost;
    private Double hold;
    private Double deduction;
    private Double finalAmount;
    private String vendor;
    private String assetsDeliveryPending;
    private String reasonForAdditionalCharges;
    private String pickUpDate;
    private String status;
    private String date;
    private String vendorName;
    private String freightCategory;
    private String project;
    private String invoiceNo;
    private String billingMonth;
    private String billing;
    private String deliveryDate;
    private String amountReceived;

    // Additional field for email (if vendor email is stored elsewhere)
    private String vendorEmail;
}