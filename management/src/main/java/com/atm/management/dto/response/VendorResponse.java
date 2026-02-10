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
public class VendorResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String status;
    private Integer assetsAllocated;
    private Integer activeSites;
    private BigDecimal totalCost;
    private String freightCategory;
    private BigDecimal rating;
    private LocalDate joinedDate;
    private String contactPerson;
    private LocalDateTime createdAt;
}