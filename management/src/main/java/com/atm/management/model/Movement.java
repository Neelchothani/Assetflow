package com.atm.management.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "movements")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Movement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atm_id", nullable = false)
    private Atm atm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_file_id")
    private UploadedFile uploadedFile;

    @Column(nullable = false)
    private String fromLocation;

    @Column(nullable = false)
    private String toLocation;

    @Column(nullable = false)
    private String movementType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MovementStatus status;

    @Column(name = "mode_of_bill")
    private String modeOfBill;

    @Column(name = "docket_no")
    private String docketNo;

    @Column(name = "business_group")
    private String businessGroup;

    @Column(nullable = false)
    private String initiatedBy;

    @Column(nullable = false)
    private LocalDate initiatedDate;

    private LocalDate expectedDelivery;

    private LocalDate actualDelivery;

    @Column(unique = true)
    private String trackingNumber;

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
        if (trackingNumber == null) {
            trackingNumber = generateTrackingNumber();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    private String generateTrackingNumber() {
        return "TRK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    public enum MovementType {
        INSTALLATION,
        RELOCATION,
        MAINTENANCE,
        DECOMMISSION,
        RETURN
    }

    public enum MovementStatus {
        PENDING,
        IN_TRANSIT,
        DELIVERED,
        CANCELLED
    }
}