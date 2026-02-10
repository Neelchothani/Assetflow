package com.atm.management.controller;

import com.atm.management.dto.response.DashboardResponse;
import com.atm.management.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * Get complete dashboard data
     * GET /api/dashboard
     */
    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard() {
        DashboardResponse dashboard = dashboardService.getDashboardData();
        return ResponseEntity.ok(dashboard);
    }

    /**
     * Get dashboard KPIs only
     * GET /api/dashboard/kpis
     */
    @GetMapping("/kpis")
    public ResponseEntity<Map<String, Object>> getKPIs() {
        Map<String, Object> kpis = dashboardService.getKPIs();
        return ResponseEntity.ok(kpis);
    }

    /**
     * Get asset turnover chart data
     * GET /api/dashboard/charts/turnover
     */
    @GetMapping("/charts/turnover")
    public ResponseEntity<Map<String, Object>> getAssetTurnoverData() {
        Map<String, Object> data = dashboardService.getAssetTurnoverData();
        return ResponseEntity.ok(data);
    }

    /**
     * Get asset distribution chart data
     * GET /api/dashboard/charts/distribution
     */
    @GetMapping("/charts/distribution")
    public ResponseEntity<Map<String, Object>> getAssetDistributionData() {
        Map<String, Object> data = dashboardService.getAssetDistributionData();
        return ResponseEntity.ok(data);
    }

    /**
     * Get vendor allocation chart data
     * GET /api/dashboard/charts/vendor-allocation
     */
    @GetMapping("/charts/vendor-allocation")
    public ResponseEntity<Map<String, Object>> getVendorAllocationData() {
        Map<String, Object> data = dashboardService.getVendorAllocationData();
        return ResponseEntity.ok(data);
    }

    /**
     * Get risk trend chart data
     * GET /api/dashboard/charts/risk-trend
     */
    @GetMapping("/charts/risk-trend")
    public ResponseEntity<Map<String, Object>> getRiskTrendData() {
        Map<String, Object> data = dashboardService.getRiskTrendData();
        return ResponseEntity.ok(data);
    }

    /**
     * Get recent movements
     * GET /api/dashboard/recent-movements
     */
    @GetMapping("/recent-movements")
    public ResponseEntity<Map<String, Object>> getRecentMovements(
            @RequestParam(defaultValue = "5") int limit) {
        Map<String, Object> movements = dashboardService.getRecentMovements(limit);
        return ResponseEntity.ok(movements);
    }

    /**
     * Get system alerts
     * GET /api/dashboard/alerts
     */
    @GetMapping("/alerts")
    public ResponseEntity<Map<String, Object>> getSystemAlerts() {
        Map<String, Object> alerts = dashboardService.getSystemAlerts();
        return ResponseEntity.ok(alerts);
    }

    /**
     * Get ATM status summary
     * GET /api/dashboard/atm-status
     */
    @GetMapping("/atm-status")
    public ResponseEntity<Map<String, Object>> getAtmStatusSummary() {
        Map<String, Object> summary = dashboardService.getAtmStatusSummary();
        return ResponseEntity.ok(summary);
    }

    /**
     * Get location-wise ATM distribution
     * GET /api/dashboard/location-distribution
     */
    @GetMapping("/location-distribution")
    public ResponseEntity<Map<String, Object>> getLocationDistribution() {
        Map<String, Object> distribution = dashboardService.getLocationDistribution();
        return ResponseEntity.ok(distribution);
    }

    /**
     * Get monthly statistics
     * GET /api/dashboard/monthly-stats
     */
    @GetMapping("/monthly-stats")
    public ResponseEntity<Map<String, Object>> getMonthlyStatistics(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        Map<String, Object> stats = dashboardService.getMonthlyStatistics(year, month);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get performance metrics
     * GET /api/dashboard/performance
     */
    @GetMapping("/performance")
    public ResponseEntity<Map<String, Object>> getPerformanceMetrics() {
        Map<String, Object> performance = dashboardService.getPerformanceMetrics();
        return ResponseEntity.ok(performance);
    }

    /**
     * Refresh dashboard data
     * POST /api/dashboard/refresh
     */
    @PostMapping("/refresh")
    public ResponseEntity<DashboardResponse> refreshDashboard() {
        DashboardResponse dashboard = dashboardService.getDashboardData();
        return ResponseEntity.ok(dashboard);
    }
}