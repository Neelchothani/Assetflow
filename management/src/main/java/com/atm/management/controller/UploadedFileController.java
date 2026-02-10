package com.atm.management.controller;

import com.atm.management.dto.response.UploadedFileResponse;
import com.atm.management.dto.response.DeletionSummaryResponse;
import com.atm.management.service.UploadedFileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/uploaded-files")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UploadedFileController {

    private final UploadedFileService uploadedFileService;

    /**
     * Get all uploaded files
     * GET /api/uploaded-files
     */
    @GetMapping
    public ResponseEntity<List<UploadedFileResponse>> getAllUploadedFiles() {
        List<UploadedFileResponse> files = uploadedFileService.getAllUploadedFiles();
        return ResponseEntity.ok(files);
    }

    /**
     * Get uploaded file by ID
     * GET /api/uploaded-files/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<UploadedFileResponse> getUploadedFileById(@PathVariable Long id) {
        UploadedFileResponse file = uploadedFileService.getUploadedFileById(id);
        return ResponseEntity.ok(file);
    }

    /**
     * Delete uploaded file and associated data
     * DELETE /api/uploaded-files/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<DeletionSummaryResponse> deleteUploadedFile(@PathVariable Long id) {
        DeletionSummaryResponse response = uploadedFileService.deleteUploadedFile(id);
        return ResponseEntity.ok(response);
    }
}
