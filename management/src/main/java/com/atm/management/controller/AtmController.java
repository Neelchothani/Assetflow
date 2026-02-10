package com.atm.management.controller;

import com.atm.management.dto.request.AtmRequest;
import com.atm.management.dto.response.AtmResponse;
import com.atm.management.service.AtmService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/atms")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AtmController {

    private final AtmService atmService;

    @GetMapping
    public ResponseEntity<List<AtmResponse>> getAllAtms() {
        List<AtmResponse> atms = atmService.getAllAtms();
        return ResponseEntity.ok(atms);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AtmResponse> getAtmById(@PathVariable Long id) {
        AtmResponse atm = atmService.getAtmById(id);
        return ResponseEntity.ok(atm);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<AtmResponse>> getAtmsByStatus(@PathVariable String status) {
        List<AtmResponse> atms = atmService.getAtmsByStatus(status);
        return ResponseEntity.ok(atms);
    }

    @GetMapping("/search")
    public ResponseEntity<List<AtmResponse>> searchAtms(@RequestParam String keyword) {
        List<AtmResponse> atms = atmService.searchAtms(keyword);
        return ResponseEntity.ok(atms);
    }

    @PostMapping
    public ResponseEntity<AtmResponse> createAtm(@Valid @RequestBody AtmRequest request) {
        AtmResponse atm = atmService.createAtm(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(atm);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AtmResponse> updateAtm(
            @PathVariable Long id,
            @Valid @RequestBody AtmRequest request) {
        AtmResponse atm = atmService.updateAtm(id, request);
        return ResponseEntity.ok(atm);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<AtmResponse> updateAtmStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        AtmResponse atm = atmService.updateAtmStatus(id, status);
        return ResponseEntity.ok(atm);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteAtm(@PathVariable Long id) {
        atmService.deleteAtm(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "ATM deleted successfully");
        return ResponseEntity.ok(response);
    }
}