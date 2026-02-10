package com.atm.management.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "vendors")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Vendor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String email;

    @Column(nullable = false)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VendorStatus status;

    @Column(length = 500)
    private String address;

    private String contactPerson;

    private String taxId;

    private Integer assetsAllocated = 0;

    private Integer activeSites = 0;

    private String freightCategory;

    @Column(precision = 15, scale = 2)
    private BigDecimal totalCost = BigDecimal.ZERO;

    @Column(precision = 3, scale = 2)
    private BigDecimal rating = BigDecimal.ZERO;

    private LocalDate joinedDate;

    private LocalDate contractStartDate;

    private LocalDate contractEndDate;

    @Column(length = 1000)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_file_id")
    private UploadedFile uploadedFile;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (assetsAllocated == null) {
            assetsAllocated = 0;
        }
        if (activeSites == null) {
            activeSites = 0;
        }
        if (freightCategory == null) {
            freightCategory = null;
        }
        if (totalCost == null) {
            totalCost = BigDecimal.ZERO;
        }
        if (rating == null) {
            rating = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum VendorStatus {
        ACTIVE,
        INACTIVE,
        SUSPENDED
    }
}