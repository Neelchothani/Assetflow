package com.atm.management.controller;

import com.atm.management.dto.request.CostingRequest;
import com.atm.management.dto.response.CostingResponse;
import com.atm.management.service.CostingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/costings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CostingController {

    private final CostingService costingService;

    @GetMapping
    public ResponseEntity<List<CostingResponse>> getAllCostings() {
        List<CostingResponse> costings = costingService.getAllCostings();
        return ResponseEntity.ok(costings);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CostingResponse> getCostingById(@PathVariable Long id) {
        CostingResponse costing = costingService.getCostingById(id);
        return ResponseEntity.ok(costing);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<CostingResponse>> getCostingsByStatus(@PathVariable String status) {
        List<CostingResponse> costings = costingService.getCostingsByStatus(status);
        return ResponseEntity.ok(costings);
    }

    @GetMapping("/pending")
    public ResponseEntity<List<CostingResponse>> getPendingCostings() {
        List<CostingResponse> costings = costingService.getCostingsByStatus("PENDING");
        return ResponseEntity.ok(costings);
    }

    @GetMapping("/atm/{atmId}")
    public ResponseEntity<List<CostingResponse>> getCostingsByAtm(@PathVariable Long atmId) {
        List<CostingResponse> costings = costingService.getCostingsByAtm(atmId);
        return ResponseEntity.ok(costings);
    }

    @GetMapping("/vendor/{vendorId}")
    public ResponseEntity<List<CostingResponse>> getCostingsByVendor(@PathVariable Long vendorId) {
        List<CostingResponse> costings = costingService.getCostingsByVendor(vendorId);
        return ResponseEntity.ok(costings);
    }

    @PostMapping
    public ResponseEntity<CostingResponse> createCosting(@Valid @RequestBody CostingRequest request) {
        CostingResponse costing = costingService.createCosting(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(costing);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CostingResponse> updateCosting(
            @PathVariable Long id,
            @Valid @RequestBody CostingRequest request) {
        CostingResponse costing = costingService.updateCosting(id, request);
        return ResponseEntity.ok(costing);
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<CostingResponse> approveCosting(
            @PathVariable Long id,
            @RequestParam String approvedBy) {
        CostingResponse costing = costingService.approveCosting(id, approvedBy);
        return ResponseEntity.ok(costing);
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<CostingResponse> rejectCosting(
            @PathVariable Long id,
            @RequestParam String rejectedBy) {
        CostingResponse costing = costingService.rejectCosting(id, rejectedBy);
        return ResponseEntity.ok(costing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteCosting(@PathVariable Long id) {
        costingService.deleteCosting(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Costing deleted successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getCostingStats() {
        Map<String, Object> stats = costingService.getCostingStatistics();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getCostingSummary() {
        Map<String, Object> summary = new HashMap<>();
        summary.put("pending", costingService.getCostingsByStatus("PENDING"));
        summary.put("approved", costingService.getCostingsByStatus("APPROVED"));
        summary.put("rejected", costingService.getCostingsByStatus("REJECTED"));
        summary.put("statistics", costingService.getCostingStatistics());
        return ResponseEntity.ok(summary);
    }
}