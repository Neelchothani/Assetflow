package com.atm.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VendorSummary {
    private Long id;
    private String name;
    private String email;
    private String phone;

    // Additional constructor for cases where phone is not needed
    public VendorSummary(Long id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }
}