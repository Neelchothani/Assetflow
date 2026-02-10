package com.atm.management.controller;

import com.atm.management.dto.request.EmailRequest;
import com.atm.management.dto.response.VendorDataResponse;
import com.atm.management.dto.response.VendorResponse;
import com.atm.management.model.UploadedFile;
import com.atm.management.model.EmailRecipient;
import com.atm.management.service.MailingService;
import com.atm.management.service.UploadedFileService;
import com.atm.management.service.VendorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/mailing")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MailingController {

    private final MailingService mailingService;
    private final VendorService vendorService;
    private final UploadedFileService uploadedFileService;

    /**
     * Upload Excel file and parse vendor data, then save vendors to database
     * POST /api/mailing/upload
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadExcelFile(
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            throw new IllegalArgumentException("Please select a file to upload");
        }

        // Validate file type
        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            throw new IllegalArgumentException("Only Excel files (.xlsx, .xls) are supported");
        }

        // Validate file size (10MB limit)
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new IllegalArgumentException("File size exceeds 10MB limit");
        }

        try {
            // Save file physically
            String storedFilename = UUID.randomUUID().toString() + "_" + filename;
            Path uploadPath = Paths.get("uploads", "excel");
            Files.createDirectories(uploadPath);
            Path filePath = uploadPath.resolve(storedFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Parse Excel file
            VendorDataResponse response = mailingService.parseAndValidateExcelFile(file);
            log.info("Excel file parsed. Valid: {}, Vendors found: {}", response.isValid(), response.getUniqueVendors());

            // Extract all recipients for asset and movement creation
            List<EmailRecipient> allRecipients = mailingService.extractAllRecipients(file);
            log.info("Total recipients extracted: {}", allRecipients != null ? allRecipients.size() : "null");
            if (allRecipients != null && !allRecipients.isEmpty()) {
                log.info("First recipient ATM BNA ID: {}, Vendor: {}", allRecipients.get(0).getAtmBnaId(), allRecipients.get(0).getVendorName());
            }

            // Create uploaded file record
            UploadedFile uploadedFile = new UploadedFile();
            uploadedFile.setOriginalFilename(filename);
            uploadedFile.setStoredFilename(storedFilename);
            uploadedFile.setFilePath(filePath.toString());
            uploadedFile.setFileSize(file.getSize());
            uploadedFile.setContentType(file.getContentType() != null ? file.getContentType() : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            uploadedFile.setFileType(UploadedFile.FileType.EXCEL_VENDOR_DATA);
            uploadedFile.setTotalRows(response.getTotalRows());
            uploadedFile.setUniqueVendors(response.getUniqueVendors());
            uploadedFile.setNotes(response.getMessage());
            uploadedFile.setVendorsCreated(0); // Initialize to 0 before saving

            // IMPORTANT: Save uploaded file FIRST before using it in entity creation
            uploadedFileService.saveUploadedFile(uploadedFile);
            log.info("Uploaded file saved with ID: {}", uploadedFile.getId());

            int vendorsCreated = 0;
            int assetsCreated = 0;
            int movementsCreated = 0;
            Map<String, Object> assetCreationResult = new HashMap<>();
            Map<String, Object> movementCreationResult = new HashMap<>();

            // Save vendors to database if parsing was successful
            if (response.isValid() && response.getVendors() != null && !response.getVendors().isEmpty()) {
                List<String> vendorNames = response.getVendors().stream()
                        .map(VendorDataResponse.VendorInfo::getVendorName)
                        .distinct()
                        .toList();

                // STEP 1: Create vendors first
                List<VendorResponse> savedVendors = vendorService.createVendorsFromExcel(vendorNames, uploadedFile);
                vendorsCreated = savedVendors.size();
                log.info("✓ Vendors created: {}", vendorsCreated);

                // STEP 2: Create assets (ATMs) from Excel data - MUST happen after vendors
                log.info("Starting asset creation with {} recipients", allRecipients != null ? allRecipients.size() : 0);
                assetCreationResult = mailingService.createAssetsFromExcelData(allRecipients, uploadedFile);
                log.info("Asset creation result: {}", assetCreationResult);
                assetsCreated = (int) assetCreationResult.getOrDefault("assetsCreated", 0);
                log.info("✓ Assets created: {}", assetsCreated);

                // STEP 3: Create movements ONLY AFTER assets are created
                if (assetsCreated > 0) {
                    log.info("Starting movement creation with {} recipients", allRecipients != null ? allRecipients.size() : 0);
                    movementCreationResult = mailingService.createMovementsFromExcelData(allRecipients, uploadedFile);
                    log.info("Movement creation result: {}", movementCreationResult);
                    movementsCreated = (int) movementCreationResult.getOrDefault("movementsCreated", 0);
                    log.info("✓ Movements created: {}", movementsCreated);
                } else {
                    log.warn("⚠ Skipping movement creation - no assets were created");
                    movementCreationResult.put("success", false);
                    movementCreationResult.put("message", "Skipped: No assets created");
                    movementCreationResult.put("movementsCreated", 0);
                }

                uploadedFile.setVendorsCreated(vendorsCreated);
                uploadedFileService.saveUploadedFile(uploadedFile);
            } else {
                uploadedFile.setVendorsCreated(0);
                uploadedFileService.saveUploadedFile(uploadedFile);
            }

            // Prepare response
            Map<String, Object> result = new HashMap<>();
            result.put("success", vendorsCreated > 0 && assetsCreated > 0);
            result.put("vendorsParsed", response.getUniqueVendors());
            result.put("vendorsCreated", vendorsCreated);
            result.put("assetsCreated", assetsCreated);
            result.put("movementsCreated", movementsCreated);
            result.put("totalRowsProcessed", response.getTotalRows());
            result.put("message", String.format("✓ Successfully processed Excel file. Created %d vendors, %d assets, %d movements", 
                    vendorsCreated, assetsCreated, movementsCreated));
            result.put("uploadDetails", response);
            result.put("assetCreationDetails", assetCreationResult);
            result.put("movementCreationDetails", movementCreationResult);
            result.put("uploadedFileId", uploadedFile.getId());

            return ResponseEntity.ok(result);

        } catch (IOException e) {
            throw new RuntimeException("Failed to save uploaded file: " + e.getMessage());
        }
    }

    /**
     * Send emails to validated recipients
     * POST /api/mailing/send
     */
    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendEmails(@Valid @RequestBody EmailRequest request) {
        List<String> emails = request.getRecipients().stream().map(r -> r.getEmail()).toList();
        Object serviceResult = mailingService.sendBulkEmails(emails, request.getSubject(), request.getBody());
        Map<String, Object> result = new HashMap<>();
        result.put("result", serviceResult);
        return ResponseEntity.ok(result);
    }

    /**
     * Send single email
     * POST /api/mailing/send-single
     */
    @PostMapping("/send-single")
    public ResponseEntity<Map<String, String>> sendSingleEmail(
            @RequestParam String to,
            @RequestParam String subject,
            @RequestParam String body,
            @RequestParam(required = false) String name) {
        Object serviceResult = mailingService.sendSingleEmail(to, subject, body);

        Map<String, String> response = new HashMap<>();
        response.put("message", String.valueOf(serviceResult));
        response.put("recipient", to);
        return ResponseEntity.ok(response);
    }

    /**
     * Validate email addresses
     * POST /api/mailing/validate
     */
    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateEmails(@RequestBody List<String> emails) {
        Object validation = mailingService.validateEmailAddresses(emails);
        Map<String, Object> response = new HashMap<>();
        response.put("result", validation);
        return ResponseEntity.ok(response);
    }

    /**
     * Get email templates
     * GET /api/mailing/templates
     */
    @GetMapping("/templates")
    public ResponseEntity<Map<String, Object>> getEmailTemplates() {
        Object templates = mailingService.getEmailTemplates();
        Map<String, Object> response = new HashMap<>();
        response.put("templates", templates);
        return ResponseEntity.ok(response);
    }

    /**
     * Send asset movement notification
     * POST /api/mailing/notify/movement
     */
    @PostMapping("/notify/movement")
    public ResponseEntity<Map<String, String>> sendMovementNotification(
            @RequestParam Long movementId,
            @RequestParam String recipientEmail,
            @RequestParam(required = false) String movementType) {

        Object serviceResult = mailingService.sendMovementNotification(movementId, movementType != null ? movementType : "movement", recipientEmail);

        Map<String, String> response = new HashMap<>();
        response.put("message", String.valueOf(serviceResult));
        return ResponseEntity.ok(response);
    }

    /**
     * Send costing approval request
     * POST /api/mailing/notify/costing
     */
    @PostMapping("/notify/costing")
    public ResponseEntity<Map<String, String>> sendCostingNotification(
            @RequestParam Long costingId,
            @RequestParam String recipientEmail,
            @RequestParam(required = false) String costingType,
            @RequestParam(required = false) Double amount) {

        Object serviceResult = mailingService.sendCostingNotification(costingId, costingType != null ? costingType : "costing", amount != null ? amount : 0.0, recipientEmail);

        Map<String, String> response = new HashMap<>();
        response.put("message", String.valueOf(serviceResult));
        return ResponseEntity.ok(response);
    }

    /**
     * Send ATM maintenance reminder
     * POST /api/mailing/notify/maintenance
     */
    @PostMapping("/notify/maintenance")
    public ResponseEntity<Map<String, String>> sendMaintenanceReminder(
            @RequestParam Long atmId,
            @RequestParam String recipientEmail,
            @RequestParam(required = false) String nextMaintenanceDate) {

        Object serviceResult = mailingService.sendMaintenanceReminder(atmId, nextMaintenanceDate != null ? nextMaintenanceDate : "TBD", recipientEmail);

        Map<String, String> response = new HashMap<>();
        response.put("message", String.valueOf(serviceResult));
        return ResponseEntity.ok(response);
    }

    /**
     * Get email sending history
     * GET /api/mailing/history
     */
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getEmailHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Object history = mailingService.getEmailHistory(page, size);
        Map<String, Object> response = new HashMap<>();
        response.put("history", history);
        return ResponseEntity.ok(response);
    }

    /**
     * Get email statistics
     * GET /api/mailing/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getEmailStats() {
        Object stats = mailingService.getEmailStatistics();
        Map<String, Object> response = new HashMap<>();
        response.put("stats", stats);
        return ResponseEntity.ok(response);
    }

    /**
     * Download email template
     * GET /api/mailing/template/download
     */
    @GetMapping("/template/download")
    public ResponseEntity<byte[]> downloadEmailTemplate(@RequestParam(defaultValue = "default") String templateName) {
        Object template = mailingService.generateEmailTemplate(templateName);

        byte[] templateBytes;
        if (template instanceof byte[]) {
            templateBytes = (byte[]) template;
        } else {
            templateBytes = String.valueOf(template).getBytes();
        }

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=email_template.xlsx")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(templateBytes);
    }

    /**
     * Test email configuration
     * POST /api/mailing/test
     */
    @PostMapping("/test")
    public ResponseEntity<Map<String, String>> testEmailConfiguration(
            @RequestParam String testEmail) {

        boolean success = mailingService.testEmailConnection(testEmail);

        Map<String, String> response = new HashMap<>();
        if (success) {
            response.put("message", "Test email sent successfully. Please check your inbox.");
            response.put("status", "success");
        } else {
            response.put("message", "Failed to send test email. Please check email configuration.");
            response.put("status", "error");
        }

        return ResponseEntity.ok(response);
    }
}