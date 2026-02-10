package com.atm.management.service;

import com.atm.management.dto.request.MovementRequest;
import com.atm.management.dto.response.AtmSummary;
import com.atm.management.dto.response.MovementResponse;
import com.atm.management.exception.ResourceNotFoundException;
import com.atm.management.model.Atm;
import com.atm.management.model.Movement;
import com.atm.management.repository.AtmRepository;
import com.atm.management.repository.MovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MovementService {

    private final MovementRepository movementRepository;
    private final AtmRepository atmRepository;

    @Transactional(readOnly = true)
    public List<MovementResponse> getAllMovements() {
        return movementRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MovementResponse getMovementById(Long id) {
        Movement movement = movementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movement not found with id: " + id));
        return mapToResponse(movement);
    }

    @Transactional(readOnly = true)
    public List<MovementResponse> getMovementsByStatus(String status) {
        Movement.MovementStatus movementStatus = Movement.MovementStatus.valueOf(status.toUpperCase().replace("-", "_"));
        return movementRepository.findByStatus(movementStatus)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MovementResponse> getMovementsByType(String type) {
        return movementRepository.findAll()
                .stream()
                .filter(m -> m.getMovementType() != null && m.getMovementType().equalsIgnoreCase(type))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MovementResponse> getMovementsByAtm(Long atmId) {
        return movementRepository.findByAtmId(atmId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MovementResponse> getRecentMovements(int limit) {
        return movementRepository.findRecentMovements()
                .stream()
                .limit(limit)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public MovementResponse createMovement(MovementRequest request) {
        Atm atm = atmRepository.findById(request.getAtmId())
                .orElseThrow(() -> new ResourceNotFoundException("ATM not found with id: " + request.getAtmId()));

        Movement movement = new Movement();
        mapRequestToEntity(request, movement, atm);
        movement.setStatus(Movement.MovementStatus.PENDING);
        movement.setInitiatedDate(LocalDate.now());

        Movement savedMovement = movementRepository.save(movement);
        return mapToResponse(savedMovement);
    }

    @Transactional
    public MovementResponse updateMovement(Long id, MovementRequest request) {
        Movement movement = movementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movement not found with id: " + id));

        Atm atm = atmRepository.findById(request.getAtmId())
                .orElseThrow(() -> new ResourceNotFoundException("ATM not found with id: " + request.getAtmId()));

        mapRequestToEntity(request, movement, atm);
        Movement updatedMovement = movementRepository.save(movement);
        return mapToResponse(updatedMovement);
    }

    @Transactional
    public MovementResponse updateMovementStatus(Long id, String status) {
        Movement movement = movementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movement not found with id: " + id));

        movement.setStatus(Movement.MovementStatus.valueOf(status.toUpperCase().replace("-", "_")));

        if (status.equalsIgnoreCase("DELIVERED")) {
            movement.setActualDelivery(LocalDate.now());
        }

        Movement updatedMovement = movementRepository.save(movement);
        return mapToResponse(updatedMovement);
    }

    @Transactional
    public MovementResponse markAsDelivered(Long id) {
        Movement movement = movementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movement not found with id: " + id));

        movement.setStatus(Movement.MovementStatus.DELIVERED);
        movement.setActualDelivery(LocalDate.now());

        Movement updatedMovement = movementRepository.save(movement);
        return mapToResponse(updatedMovement);
    }

    @Transactional
    public void deleteMovement(Long id) {
        if (!movementRepository.existsById(id)) {
            throw new ResourceNotFoundException("Movement not found with id: " + id);
        }
        movementRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMovementStatistics() {
        Map<String, Object> stats = new HashMap<>();

        Long totalMovements = movementRepository.count();
        Long pendingMovements = movementRepository.countByStatus(Movement.MovementStatus.PENDING);
        Long inTransitMovements = movementRepository.countByStatus(Movement.MovementStatus.IN_TRANSIT);
        Long deliveredMovements = movementRepository.countByStatus(Movement.MovementStatus.DELIVERED);

        stats.put("total", totalMovements);
        stats.put("pending", pendingMovements);
        stats.put("inTransit", inTransitMovements);
        stats.put("delivered", deliveredMovements);

        return stats;
    }

    // Helper methods
    private void mapRequestToEntity(MovementRequest request, Movement movement, Atm atm) {
        movement.setAtm(atm);
        movement.setFromLocation(request.getFromLocation());
        movement.setToLocation(request.getToLocation());
        movement.setMovementType(request.getMovementType());
        movement.setInitiatedBy(request.getInitiatedBy());
        movement.setExpectedDelivery(request.getExpectedDelivery());
        movement.setNotes(request.getNotes());
        movement.setDocketNo(request.getDocketNo());
        movement.setBusinessGroup(request.getBusinessGroup());
        movement.setModeOfBill(request.getModeOfBill());
    }

    private MovementResponse mapToResponse(Movement movement) {
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