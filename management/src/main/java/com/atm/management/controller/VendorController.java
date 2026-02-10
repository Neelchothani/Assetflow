package com.atm.management.controller;

import com.atm.management.dto.request.VendorRequest;
import com.atm.management.dto.response.VendorResponse;
import com.atm.management.service.VendorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vendors")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VendorController {

    private final VendorService vendorService;

    @GetMapping
    public ResponseEntity<List<VendorResponse>> getAllVendors() {
        List<VendorResponse> vendors = vendorService.getAllVendors();
        return ResponseEntity.ok(vendors);
    }

    @GetMapping("/{id}")
    public ResponseEntity<VendorResponse> getVendorById(@PathVariable Long id) {
        VendorResponse vendor = vendorService.getVendorById(id);
        return ResponseEntity.ok(vendor);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<VendorResponse>> getVendorsByStatus(@PathVariable String status) {
        List<VendorResponse> vendors = vendorService.getVendorsByStatus(status);
        return ResponseEntity.ok(vendors);
    }

    @GetMapping("/search")
    public ResponseEntity<List<VendorResponse>> searchVendors(@RequestParam String keyword) {
        List<VendorResponse> vendors = vendorService.searchVendors(keyword);
        return ResponseEntity.ok(vendors);
    }

    @PostMapping
    public ResponseEntity<VendorResponse> createVendor(@Valid @RequestBody VendorRequest request) {
        VendorResponse vendor = vendorService.createVendor(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(vendor);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VendorResponse> updateVendor(
            @PathVariable Long id,
            @Valid @RequestBody VendorRequest request) {
        VendorResponse vendor = vendorService.updateVendor(id, request);
        return ResponseEntity.ok(vendor);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<VendorResponse> updateVendorStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        VendorResponse vendor = vendorService.updateVendorStatus(id, status);
        return ResponseEntity.ok(vendor);
    }

    @PatchMapping("/{id}/rating")
    public ResponseEntity<VendorResponse> updateVendorRating(
            @PathVariable Long id,
            @RequestParam Double rating) {
        VendorResponse vendor = vendorService.updateVendorRating(id, rating);
        return ResponseEntity.ok(vendor);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteVendor(@PathVariable Long id) {
        vendorService.deleteVendor(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Vendor deleted successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getVendorStats() {
        Map<String, Object> stats = vendorService.getVendorStatistics();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/{id}/atms")
    public ResponseEntity<Map<String, Object>> getVendorAtms(@PathVariable Long id) {
        Map<String, Object> atms = vendorService.getVendorAtms(id);
        return ResponseEntity.ok(atms);
    }
}