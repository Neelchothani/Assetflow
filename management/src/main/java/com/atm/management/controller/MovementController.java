package com.atm.management.controller;

import com.atm.management.dto.request.MovementRequest;
import com.atm.management.dto.response.MovementResponse;
import com.atm.management.service.MovementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/movements")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MovementController {

    private final MovementService movementService;

    @GetMapping
    public ResponseEntity<List<MovementResponse>> getAllMovements() {
        List<MovementResponse> movements = movementService.getAllMovements();
        return ResponseEntity.ok(movements);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovementResponse> getMovementById(@PathVariable Long id) {
        MovementResponse movement = movementService.getMovementById(id);
        return ResponseEntity.ok(movement);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<MovementResponse>> getMovementsByStatus(@PathVariable String status) {
        List<MovementResponse> movements = movementService.getMovementsByStatus(status);
        return ResponseEntity.ok(movements);
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<MovementResponse>> getMovementsByType(@PathVariable String type) {
        List<MovementResponse> movements = movementService.getMovementsByType(type);
        return ResponseEntity.ok(movements);
    }

    @GetMapping("/atm/{atmId}")
    public ResponseEntity<List<MovementResponse>> getMovementsByAtm(@PathVariable Long atmId) {
        List<MovementResponse> movements = movementService.getMovementsByAtm(atmId);
        return ResponseEntity.ok(movements);
    }

    @GetMapping("/recent")
    public ResponseEntity<List<MovementResponse>> getRecentMovements(
            @RequestParam(defaultValue = "10") int limit) {
        List<MovementResponse> movements = movementService.getRecentMovements(limit);
        return ResponseEntity.ok(movements);
    }

    @PostMapping
    public ResponseEntity<MovementResponse> createMovement(@Valid @RequestBody MovementRequest request) {
        MovementResponse movement = movementService.createMovement(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(movement);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MovementResponse> updateMovement(
            @PathVariable Long id,
            @Valid @RequestBody MovementRequest request) {
        MovementResponse movement = movementService.updateMovement(id, request);
        return ResponseEntity.ok(movement);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<MovementResponse> updateMovementStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        MovementResponse movement = movementService.updateMovementStatus(id, status);
        return ResponseEntity.ok(movement);
    }

    @PatchMapping("/{id}/deliver")
    public ResponseEntity<MovementResponse> markAsDelivered(@PathVariable Long id) {
        MovementResponse movement = movementService.markAsDelivered(id);
        return ResponseEntity.ok(movement);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteMovement(@PathVariable Long id) {
        movementService.deleteMovement(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Movement deleted successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getMovementStats() {
        Map<String, Object> stats = movementService.getMovementStatistics();
        return ResponseEntity.ok(stats);
    }
}