package com.atm.management.service;

import com.atm.management.dto.response.*;
import com.atm.management.model.Atm;
import com.atm.management.model.Costing;
import com.atm.management.model.Movement;
import com.atm.management.model.Vendor;
import com.atm.management.repository.AtmRepository;
import com.atm.management.repository.CostingRepository;
import com.atm.management.repository.MovementRepository;
import com.atm.management.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final AtmRepository atmRepository;
    private final VendorRepository vendorRepository;
    private final MovementRepository movementRepository;
    private final CostingRepository costingRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboardData() {
        Map<String, Object> kpis = getKPIs();
        List<ChartData> assetTurnover = getAssetTurnoverDataList();
        List<ChartData> assetDistribution = getAssetDistributionDataList();
        List<ChartData> vendorAllocation = getVendorAllocationDataList();
        List<ChartData> riskTrend = getRiskTrendDataList();
        List<MovementResponse> recentMovements = getRecentMovementsList(5);
        Map<String, Object> alerts = getSystemAlerts();

        return DashboardResponse.builder()
                .kpis(kpis)
                .assetTurnover(assetTurnover)
                .assetDistribution(assetDistribution)
                .vendorAllocation(vendorAllocation)
                .riskTrend(riskTrend)
                .recentMovements(recentMovements)
                .alerts(alerts)
                .build();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getKPIs() {
        Map<String, Object> kpis = new HashMap<>();

        Long totalAssets = atmRepository.count();
        Long activeAssets = totalAssets; // Considering all assets as active for now
        Long idleAssets = 0L;
        Long inMaintenance = 0L;
        Long totalVendors = vendorRepository.count();
        Long activeVendors = vendorRepository.countActiveVendors();
        Long pendingMovements = movementRepository.countByStatus(Movement.MovementStatus.PENDING);
        Long pendingApprovals = costingRepository.countPendingApprovals();

        // Calculate asset turnover (simplified - active/total * 100)
        Double assetTurnover = totalAssets > 0 ?
                (activeAssets.doubleValue() / totalAssets.doubleValue() * 100) : 0.0;

        // Calculate risk score (based on idle + maintenance ATMs)
        Integer riskScore = (int) ((idleAssets + inMaintenance) * 100 / Math.max(totalAssets, 1));

        kpis.put("totalAssets", totalAssets);
        kpis.put("activeAssets", activeAssets);
        kpis.put("idleAssets", idleAssets);
        kpis.put("inMaintenance", inMaintenance);
        kpis.put("assetTurnover", Math.round(assetTurnover * 10.0) / 10.0);
        kpis.put("riskScore", riskScore);
        kpis.put("totalVendors", totalVendors);
        kpis.put("activeVendors", activeVendors);
        kpis.put("pendingMovements", pendingMovements);
        kpis.put("pendingApprovals", pendingApprovals);

        return kpis;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAssetTurnoverData() {
        Map<String, Object> data = new HashMap<>();
        data.put("data", getAssetTurnoverDataList());
        return data;
    }

    private List<ChartData> getAssetTurnoverDataList() {
        List<ChartData> chartData = new ArrayList<>();

        // Generate data for last 6 months
        LocalDate now = LocalDate.now();
        for (int i = 5; i >= 0; i--) {
            YearMonth month = YearMonth.from(now.minusMonths(i));
            String monthName = month.getMonth().name().substring(0, 3);

            // Simulate turnover percentage (in production, calculate from actual data)
            double turnover = 8.0 + Math.random() * 5.0; // Random between 8-13%

            chartData.add(new ChartData(monthName, Math.round(turnover * 10.0) / 10.0));
        }

        return chartData;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAssetDistributionData() {
        Map<String, Object> data = new HashMap<>();
        data.put("data", getAssetDistributionDataList());
        return data;
    }

    private List<ChartData> getAssetDistributionDataList() {
        List<ChartData> chartData = new ArrayList<>();

        // Dynamic status distribution
        List<String> statuses = atmRepository.findDistinctAssetStatuses();
        for (String status : statuses) {
            if (status != null && !status.trim().isEmpty()) {
                Long count = atmRepository.countByAssetStatus(status);
                // Generate a random color or use a default one
                String color = "hsl(" + (Math.abs(status.hashCode()) % 360) + ", 70%, 50%)";
                chartData.add(new ChartData(status, count, color, status));
            }
        }

        return chartData;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getVendorAllocationData() {
        Map<String, Object> data = new HashMap<>();
        data.put("data", getVendorAllocationDataList());
        return data;
    }

    private List<ChartData> getVendorAllocationDataList() {
        List<Vendor> topVendors = vendorRepository.findAll()
                .stream()
                .sorted((v1, v2) -> Integer.compare(v2.getAssetsAllocated(), v1.getAssetsAllocated()))
                .limit(5)
                .collect(Collectors.toList());

        return topVendors.stream()
                .map(vendor -> new ChartData(
                        vendor.getName().length() > 15 ?
                                vendor.getName().substring(0, 15) : vendor.getName(),
                        vendor.getAssetsAllocated()
                ))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getRiskTrendData() {
        Map<String, Object> data = new HashMap<>();
        data.put("data", getRiskTrendDataList());
        return data;
    }

    private List<ChartData> getRiskTrendDataList() {
        List<ChartData> chartData = new ArrayList<>();

        // Generate risk trend for last 6 months (simulated)
        LocalDate now = LocalDate.now();
        for (int i = 5; i >= 0; i--) {
            YearMonth month = YearMonth.from(now.minusMonths(i));
            String monthName = month.getMonth().name().substring(0, 3);

            // Simulate decreasing risk trend
            int risk = 35 - (i * 2); // Risk decreasing over time

            chartData.add(new ChartData(monthName, risk));
        }

        return chartData;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getRecentMovements(int limit) {
        Map<String, Object> data = new HashMap<>();
        data.put("movements", getRecentMovementsList(limit));
        return data;
    }

    private List<MovementResponse> getRecentMovementsList(int limit) {
        return movementRepository.findRecentMovements()
                .stream()
                .limit(limit)
                .map(this::mapMovementToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSystemAlerts() {
        Map<String, Object> alerts = new HashMap<>();
        List<Map<String, Object>> alertList = new ArrayList<>();

        // Check for ATMs needing maintenance
        LocalDate maintenanceThreshold = LocalDate.now().plusDays(30);
        List<Atm> needsMaintenance = atmRepository.findAll()
                .stream()
                .filter(atm -> atm.getNextMaintenanceDate() != null &&
                        atm.getNextMaintenanceDate().isBefore(maintenanceThreshold))
                .collect(Collectors.toList());

        if (!needsMaintenance.isEmpty()) {
            Map<String, Object> alert = new HashMap<>();
            alert.put("type", "warning");
            alert.put("message", needsMaintenance.size() + " ATMs need maintenance within 30 days");
            alert.put("count", needsMaintenance.size());
            alertList.add(alert);
        }

        // Check for pending approvals
        Long pendingApprovals = costingRepository.countPendingApprovals();
        if (pendingApprovals > 0) {
            Map<String, Object> alert = new HashMap<>();
            alert.put("type", "info");
            alert.put("message", pendingApprovals + " costing approvals pending");
            alert.put("count", pendingApprovals);
            alertList.add(alert);
        }

        // Check for pending movements
        Long pendingMovements = movementRepository.countByStatus(Movement.MovementStatus.PENDING);
        if (pendingMovements > 0) {
            Map<String, Object> alert = new HashMap<>();
            alert.put("type", "info");
            alert.put("message", pendingMovements + " ATM movements pending");
            alert.put("count", pendingMovements);
            alertList.add(alert);
        }

        alerts.put("alerts", alertList);
        alerts.put("totalAlerts", alertList.size());

        return alerts;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAtmStatusSummary() {
        Map<String, Object> summary = new HashMap<>();

        List<String> statuses = atmRepository.findDistinctAssetStatuses();
        for (String status : statuses) {
            if (status != null) {
                Long count = atmRepository.countByAssetStatus(status);
                summary.put(status.toLowerCase(), count);
            }
        }

        return summary;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getLocationDistribution() {
        Map<String, Object> data = new HashMap<>();

        List<Atm> allAtms = atmRepository.findAll();
        Map<String, Long> locationCounts = allAtms.stream()
                .collect(Collectors.groupingBy(
                        atm -> {
                            String location = atm.getLocation();
                            // Extract city from location
                            if (location.contains(",")) {
                                return location.substring(location.lastIndexOf(",") + 1).trim();
                            }
                            return location;
                        },
                        Collectors.counting()
                ));

        data.put("locations", locationCounts);
        return data;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMonthlyStatistics(Integer year, Integer month) {
        Map<String, Object> stats = new HashMap<>();

        if (year == null) year = LocalDate.now().getYear();
        if (month == null) month = LocalDate.now().getMonthValue();

        stats.put("year", year);
        stats.put("month", month);
        stats.put("totalAtms", atmRepository.count());
        stats.put("totalMovements", movementRepository.count());
        stats.put("totalVendors", vendorRepository.count());

        return stats;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPerformanceMetrics() {
        Map<String, Object> metrics = new HashMap<>();

        Long totalAtms = atmRepository.count();
        Long activeAtms = totalAtms; // Considering all assets as active for now

        double utilizationRate = totalAtms > 0 ?
                (activeAtms.doubleValue() / totalAtms.doubleValue() * 100) : 0.0;

        metrics.put("utilizationRate", Math.round(utilizationRate * 10.0) / 10.0);
        metrics.put("activePercentage", Math.round(utilizationRate));

        return metrics;
    }

    // Helper method
    private MovementResponse mapMovementToResponse(Movement movement) {
        AtmSummary atmSummary = new AtmSummary(
                movement.getAtm().getId(),
                movement.getAtm().getName(),
                movement.getAtm().getSerialNumber(),
                movement.getAtm().getLocation()
        );

        return new MovementResponse(
            movement.getId(),
            atmSummary,
            movement.getAtm().getName(),
            movement.getAtm().getId(),
            movement.getFromLocation(),
            movement.getToLocation(),
            movement.getMovementType(),
            movement.getStatus().name(),
            movement.getInitiatedBy(),
            movement.getInitiatedDate(),
            movement.getExpectedDelivery(),
            movement.getActualDelivery(),
            movement.getTrackingNumber(),
            movement.getCreatedAt(),
            movement.getDocketNo(),
            movement.getBusinessGroup(),
            movement.getModeOfBill()
        );
    }
}
