package com.atm.management.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "atms")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Atm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String serialNumber;

    @Column
    private String assetStatus;

    @Column(nullable = false)
    private String status = "ACTIVE";

    @Column(nullable = false)
    private String location;

    private String branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_file_id")
    private UploadedFile uploadedFile;

    @Column(precision = 15, scale = 2)
    private BigDecimal value;

    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "hold", precision = 15, scale = 2)
    private BigDecimal hold;

    @Column(name = "deduction", precision = 15, scale = 2)
    private BigDecimal deduction;

    @Column(name = "final_amount", precision = 15, scale = 2)
    private BigDecimal finalAmount;

    @Column(name = "vendor_cost", precision = 15, scale = 2)
    private BigDecimal vendorCost;

    private LocalDate installationDate;

    private LocalDate lastMaintenanceDate;

    private LocalDate nextMaintenanceDate;

    private String billingMonth;

    private String billingStatus;

    private LocalDate pickupDate;

    private LocalDate deliveryDate;

    @Column(name = "amount_received")
    private String amountReceived;

    @Column(name = "notice_generated", nullable = false)
    private Boolean noticeGenerated = false;

    private String manufacturer;

    private String model;

    @Column(precision = 15, scale = 2)
    private BigDecimal cashCapacity;

    @Column(precision = 15, scale = 2)
    private BigDecimal currentCashBalance;

    private Integer transactionCount = 0;

    @Column(length = 1000)
    private String notes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (transactionCount == null) {
            transactionCount = 0;
        }
        if (currentCashBalance == null) {
            currentCashBalance = BigDecimal.ZERO;
        }
        if (noticeGenerated == null) {
            noticeGenerated = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}