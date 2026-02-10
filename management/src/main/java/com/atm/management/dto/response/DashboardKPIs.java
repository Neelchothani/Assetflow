package com.atm.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardKPIs {
    private Long totalAssets;
    private Long activeAssets;
    private Long idleAssets;
    private Long inMaintenance;
    private Double assetTurnover;
    private Integer riskScore;
    private Long totalVendors;
    private Long activeVendors;
    private Long pendingMovements;
    private Long pendingApprovals;
}