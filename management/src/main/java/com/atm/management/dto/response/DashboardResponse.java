package com.atm.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardResponse {
    private Map<String, Object> kpis;
    private List<ChartData> assetTurnover;
    private List<ChartData> assetDistribution;
    private List<ChartData> vendorAllocation;
    private List<ChartData> riskTrend;
    private List<MovementResponse> recentMovements;
    private Map<String, Object> alerts;
}