package com.atm.management.service;

import com.atm.management.dto.response.UploadedFileResponse;
import com.atm.management.dto.response.DeletionSummaryResponse;
import com.atm.management.model.UploadedFile;
import com.atm.management.repository.UploadedFileRepository;
import com.atm.management.repository.VendorRepository;
import com.atm.management.repository.AtmRepository;
import com.atm.management.repository.MovementRepository;
import com.atm.management.repository.CostingRepository;
import com.atm.management.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UploadedFileService {

    private final UploadedFileRepository uploadedFileRepository;
    private final VendorRepository vendorRepository;
    private final AtmRepository atmRepository;
    private final MovementRepository movementRepository;
    private final CostingRepository costingRepository;

    public UploadedFile saveUploadedFile(UploadedFile uploadedFile) {
        return uploadedFileRepository.save(uploadedFile);
    }

    @Transactional(readOnly = true)
    public List<UploadedFileResponse> getAllUploadedFiles() {
        return uploadedFileRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UploadedFileResponse getUploadedFileById(Long id) {
        UploadedFile uploadedFile = uploadedFileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Uploaded file not found with id: " + id));
        return mapToResponse(uploadedFile);
    }

    @Transactional
    public DeletionSummaryResponse deleteUploadedFile(Long id) {
        UploadedFile uploadedFile = uploadedFileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Uploaded file not found with id: " + id));
        
        log.info("Deleting uploaded file with ID: {} and its associated data", id);
        
        // Step 1: Delete costings that reference ATMs from this uploaded file
        // This must be done FIRST to avoid constraint violations
        int costingsDeleted = costingRepository.deleteByAtmUploadedFileId(id);
        log.info("Costings deleted (by atm/uploadedFile): {}", costingsDeleted);
        
        // Step 2: Delete movements that reference ATMs linked to this uploaded file
        int movementsDeletedFromAtms = movementRepository.deleteByAtmUploadedFileId(id);
        log.info("Movements deleted (by atm/uploadedFile): {}", movementsDeletedFromAtms);

        // Step 3: Now safe to delete ATMs created from this uploaded file (no more foreign key references)
        int assetsDeleted = atmRepository.deleteByUploadedFileId(id);
        log.info("Assets deleted: {}", assetsDeleted);

        // Step 4: Delete any remaining movements that were directly linked to the uploaded file
        int movementsDeletedDirect = movementRepository.deleteByUploadedFileId(id);
        log.info("Movements deleted (direct): {}", movementsDeletedDirect);

        // Step 5: Delete vendors created from this uploaded file (only those with no remaining ATM references)
        int vendorsDeleted = vendorRepository.deleteByUploadedFileId(id);
        log.info("Vendors deleted: {}", vendorsDeleted);

        // Step 5b: Null out uploaded_file_id on any remaining vendors still pointing at this file
        // (These are vendors shared with other uploaded files - they must stay but must not block the delete)
        int vendorsDetached = vendorRepository.clearUploadedFileReference(id);
        log.info("Vendors detached from uploaded file: {}", vendorsDetached);

        // Step 6: Finally, delete the uploaded file record itself
        // Use deleteById so JPA re-fetches a fresh (clean) entity after context was cleared by bulk deletes above
        uploadedFileRepository.deleteById(id);
        log.info("Uploaded file deleted successfully");
        
        // Return summary of deletions (total movements = direct + from ATMs)
        int totalMovementsDeleted = movementsDeletedFromAtms + movementsDeletedDirect;
        return new DeletionSummaryResponse(costingsDeleted, assetsDeleted, totalMovementsDeleted, vendorsDeleted);
    }

    private UploadedFileResponse mapToResponse(UploadedFile uploadedFile) {
        UploadedFileResponse response = new UploadedFileResponse();
        response.setId(uploadedFile.getId());
        response.setOriginalFilename(uploadedFile.getOriginalFilename());
        response.setFileSize(uploadedFile.getFileSize());
        response.setContentType(uploadedFile.getContentType());
        response.setTotalRows(uploadedFile.getTotalRows());
        response.setUniqueVendors(uploadedFile.getUniqueVendors());
        response.setVendorsCreated(uploadedFile.getVendorsCreated());
        response.setCreatedAt(uploadedFile.getCreatedAt());
        response.setNotes(uploadedFile.getNotes());
        return response;
    }
}