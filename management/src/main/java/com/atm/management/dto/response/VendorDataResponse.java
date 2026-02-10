package com.atm.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VendorDataResponse {
    private boolean valid;
    private int totalRows;
    private int uniqueVendors;
    private List<VendorInfo> vendors;
    private List<String> warnings;
    private String message;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VendorInfo {
        private String vendorName;
        private int rowCount;
        private List<Integer> rowNumbers;
    }
}