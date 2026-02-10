package com.atm.management.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "costings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Costing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atm_id", nullable = false)
    private Atm atm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id", nullable = false)
    private Vendor vendor;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal baseCost;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal maintenanceCost;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal operationalCost;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal margin;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal totalCost;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CostingStatus status;

    @Column(nullable = false)
    private String submittedBy;

    @Column(nullable = false)
    private LocalDate submittedDate;

    private String approvedBy;

    private LocalDate approvedDate;

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
        calculateTotalCost();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        calculateTotalCost();
    }

    private void calculateTotalCost() {
        if (baseCost != null && maintenanceCost != null && operationalCost != null && margin != null) {
            BigDecimal subtotal = baseCost.add(maintenanceCost).add(operationalCost);
            BigDecimal marginAmount = subtotal.multiply(margin).divide(BigDecimal.valueOf(100));
            totalCost = subtotal.add(marginAmount);
        }
    }

    public enum CostingStatus {
        PENDING,
        APPROVED,
        REJECTED
    }
}