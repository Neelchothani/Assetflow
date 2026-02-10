package com.atm.management.service;

import com.atm.management.dto.response.VendorDataResponse;
import com.atm.management.model.EmailRecipient;
import com.atm.management.model.UploadedFile;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.mail.internet.MimeMessage;
import java.util.*;

@Slf4j
@Service
public class MailingService {

    private final JavaMailSender mailSender;
    private final ExcelParsingService excelParsingService;
    private final AssetCreationService assetCreationService;
    private final MovementCreationService movementCreationService;

    @Value("${spring.mail.username:noreply@assetflow.com}")
    private String fromEmail;

    @Value("${spring.mail.enabled:false}")
    private boolean mailEnabled;

    @Autowired(required = false)
    public MailingService(JavaMailSender mailSender, ExcelParsingService excelParsingService,
                         AssetCreationService assetCreationService,
                         MovementCreationService movementCreationService) {
        this.mailSender = mailSender;
        this.excelParsingService = excelParsingService;
        this.assetCreationService = assetCreationService;
        this.movementCreationService = movementCreationService;
    }

    /**
     * Send password reset email
     */
    public void sendPasswordResetEmail(String to, String name, String resetToken) {
        if (!isMailEnabled()) {
            log.warn("Email disabled. Reset token for {}: {}", to, resetToken);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("Password Reset Request - AssetFlow");
            message.setText(buildPasswordResetEmail(name, resetToken));

            mailSender.send(message);
            log.info("Password reset email sent to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", to, e);
        }
    }

    /**
     * Send welcome email
     */
    public void sendWelcomeEmail(String to, String name) {
        if (!isMailEnabled()) {
            log.info("Email disabled. Welcome message for: {}", to);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("Welcome to AssetFlow");
            message.setText(buildWelcomeEmail(name));

            mailSender.send(message);
            log.info("Welcome email sent to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send welcome email to: {}", to, e);
        }
    }

    /**
     * Send notification email
     */
    public void sendNotificationEmail(String to, String subject, String content) {
        if (!isMailEnabled()) {
            log.info("Email disabled. Notification for {}: {}", to, subject);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(content);

            mailSender.send(message);
            log.info("Notification email sent to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send notification email to: {}", to, e);
        }
    }

    /**
     * Send bulk emails to multiple recipients
     */
    public Object sendBulkEmails(List<String> recipients, String subject, String content) {
        if (!isMailEnabled()) {
            log.info("Email disabled. Bulk email to {} recipients", recipients.size());
            return "Email service is disabled";
        }

        int success = 0;
        int failed = 0;

        for (String recipient : recipients) {
            try {
                sendNotificationEmail(recipient, subject, content);
                success++;
            } catch (Exception e) {
                log.error("Failed to send bulk email to: {}", recipient, e);
                failed++;
            }
        }

        log.info("Bulk emails sent to {} recipients ({} success, {} failed)", recipients.size(), success, failed);
        return String.format("Sent to %d recipients (%d success, %d failed)", recipients.size(), success, failed);
    }

    /**
     * Send single email
     */
    public Object sendSingleEmail(String to, String subject, String content) {
        if (!isMailEnabled()) {
            return "Email service is disabled";
        }

        try {
            sendNotificationEmail(to, subject, content);
            return "Email sent successfully to " + to;
        } catch (Exception e) {
            return "Failed to send email: " + e.getMessage();
        }
    }

    /**
     * Validate email addresses
     */
    public Object validateEmailAddresses(List<String> emails) {
        if (emails == null || emails.isEmpty()) {
            return "Email list is empty";
        }

        String emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
        int valid = 0;
        int invalid = 0;

        for (String email : emails) {
            if (email != null && email.matches(emailRegex)) {
                valid++;
            } else {
                invalid++;
            }
        }

        return String.format("Total: %d, Valid: %d, Invalid: %d", emails.size(), valid, invalid);
    }

    /**
     * Get email templates
     */
    public Object getEmailTemplates() {
        return List.of(
                "password_reset",
                "welcome",
                "notification",
                "maintenance_reminder",
                "costing_notification",
                "movement_notification"
        );
    }

    /**
     * Send movement notification
     */
    public Object sendMovementNotification(Long atmId, String movementType, String recipientEmail) {
        if (!isMailEnabled()) {
            log.info("Email disabled. Movement notification for ATM: {}", atmId);
            return "Email service is disabled";
        }

        String subject = "ATM Movement Notification";
        String content = String.format("""
            Hello,
            
            This is to notify you about an ATM movement:
            
            ATM ID: %d
            Movement Type: %s
            
            Please check the system for more details.
            
            Best regards,
            AssetFlow Team
            """, atmId, movementType);

        try {
            sendNotificationEmail(recipientEmail, subject, content);
            return "Movement notification sent successfully";
        } catch (Exception e) {
            return "Failed to send notification: " + e.getMessage();
        }
    }

    /**
     * Send costing notification
     */
    public Object sendCostingNotification(Long atmId, String costingType, Double amount, String recipientEmail) {
        if (!isMailEnabled()) {
            log.info("Email disabled. Costing notification for ATM: {}", atmId);
            return "Email service is disabled";
        }

        String subject = "ATM Costing Notification";
        String content = String.format("""
            Hello,
            
            This is to notify you about an ATM costing:
            
            ATM ID: %d
            Costing Type: %s
            Amount: $%.2f
            
            Please check the system for more details.
            
            Best regards,
            AssetFlow Team
            """, atmId, costingType, amount);

        try {
            sendNotificationEmail(recipientEmail, subject, content);
            return "Costing notification sent successfully";
        } catch (Exception e) {
            return "Failed to send notification: " + e.getMessage();
        }
    }

    /**
     * Send maintenance reminder
     */
    public Object sendMaintenanceReminder(Long atmId, String nextMaintenanceDate, String recipientEmail) {
        if (!isMailEnabled()) {
            log.info("Email disabled. Maintenance reminder for ATM: {}", atmId);
            return "Email service is disabled";
        }

        String subject = "ATM Maintenance Reminder";
        String content = String.format("""
            Hello,
            
            This is a reminder for upcoming ATM maintenance:
            
            ATM ID: %d
            Next Maintenance Date: %s
            
            Please schedule the maintenance accordingly.
            
            Best regards,
            AssetFlow Team
            """, atmId, nextMaintenanceDate);

        try {
            sendNotificationEmail(recipientEmail, subject, content);
            return "Maintenance reminder sent successfully";
        } catch (Exception e) {
            return "Failed to send reminder: " + e.getMessage();
        }
    }

    /**
     * Get email history (placeholder - implement with database if needed)
     */
    public Object getEmailHistory(int page, int size) {
        log.info("Email history requested - page: {}, size: {}", page, size);
        return List.of("No email history available - feature not implemented yet");
    }

    /**
     * Get email statistics (placeholder - implement with database if needed)
     */
    public Object getEmailStatistics() {
        log.info("Email statistics requested");
        return "Email statistics not available - feature not implemented yet";
    }

    /**
     * Generate email template (placeholder)
     */
    public Object generateEmailTemplate(String templateName) {
        log.info("Email template requested: {}", templateName);
        return "Template content for: " + templateName;
    }

    /**
     * Test email connection
     */
    public boolean testEmailConnection(String testEmail) {
        if (!isMailEnabled()) {
            log.warn("Email is disabled. Cannot test connection.");
            return false;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(testEmail);
            message.setSubject("Test Email - AssetFlow");
            message.setText("This is a test email to verify the email configuration.");

            mailSender.send(message);
            log.info("Test email sent successfully to: {}", testEmail);
            return true;
        } catch (Exception e) {
            log.error("Failed to send test email to: {}", testEmail, e);
            return false;
        }
    }

    /**
     * Parse and validate Excel file with vendor data
     */
    public VendorDataResponse parseAndValidateExcelFile(MultipartFile file) {
        try {
            return excelParsingService.parseAndValidateExcelFile(file);
        } catch (Exception e) {
            log.error("Error in parseAndValidateExcelFile", e);
            return new VendorDataResponse(false, 0, 0, null, null, "Error processing file: " + e.getMessage());
        }
    }

    /**
     * Extract all recipients from Excel file
     */
    public List<EmailRecipient> extractAllRecipients(MultipartFile file) {
        try {
            return excelParsingService.extractAllRecipients(file);
        } catch (Exception e) {
            log.error("Error extracting recipients from Excel", e);
            return new ArrayList<>();
        }
    }

    /**
     * Create assets (ATMs) from Excel data
     */
    public Map<String, Object> createAssetsFromExcelData(List<EmailRecipient> recipients, UploadedFile uploadedFile) {
        try {
            return assetCreationService.createAssetsFromExcelData(recipients, uploadedFile);
        } catch (Exception e) {
            log.error("Error creating assets from Excel data", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error creating assets: " + e.getMessage());
            error.put("assetsCreated", 0);
            return error;
        }
    }

    /**
     * Create movements from Excel data
     */
    public Map<String, Object> createMovementsFromExcelData(List<EmailRecipient> recipients, UploadedFile uploadedFile) {
        try {
            return movementCreationService.createMovementsFromExcelData(recipients, uploadedFile);
        } catch (Exception e) {
            log.error("Error creating movements from Excel data", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error creating movements: " + e.getMessage());
            error.put("movementsCreated", 0);
            return error;
        }
    }

    /**
     * Send bulk emails to recipients from Excel file - UPDATED to use Option 1
     */
    public Object sendBulkEmailsFromExcel(MultipartFile file, String subject, String content) {
        if (!isMailEnabled()) {
            return "Email service is disabled";
        }

        try {
            // Use parseAndValidateExcelFile to get vendor data
            VendorDataResponse vendorResponse = excelParsingService.parseAndValidateExcelFile(file);

            if (!vendorResponse.isValid() || vendorResponse.getVendors() == null || vendorResponse.getVendors().isEmpty()) {
                return String.format("No valid vendor data found in Excel file. %s", vendorResponse.getMessage());
            }

            // Note: This method assumes vendors have emails registered separately
            // For now, return information about parsed vendors
            String result = String.format(
                    "Vendor data parsed successfully. Found %d unique vendors with %d total rows. " +
                    "To send emails, vendors need to be registered with email addresses first.",
                    vendorResponse.getUniqueVendors(), vendorResponse.getTotalRows()
            );

            log.info("Bulk email preparation completed: {}", result);
            return result;

        } catch (Exception e) {
            log.error("Error sending bulk emails from Excel", e);
            return "Error processing Excel file: " + e.getMessage();
        }
    }

    /**
     * Personalize email content with recipient data
     */
    private String personalizeEmailContent(String template, EmailRecipient recipient) {
        return template
                .replace("{VENDOR_NAME}", recipient.getVendorName() != null ? recipient.getVendorName() : "")
                .replace("{BANK_NAME}", recipient.getBankName() != null ? recipient.getBankName() : "")
                .replace("{ATM_ID}", recipient.getAtmBnaId() != null ? recipient.getAtmBnaId() : "")
                .replace("{DOCKET_NO}", recipient.getDocketNo() != null ? recipient.getDocketNo() : "")
                .replace("{FROM_LOCATION}", recipient.getFromLocation() != null ? recipient.getFromLocation() : "")
                .replace("{TO_LOCATION}", recipient.getToLocation() != null ? recipient.getToLocation() : "")
                .replace("{STATUS}", recipient.getStatus() != null ? recipient.getStatus() : "")
                .replace("{FINAL_AMOUNT}", recipient.getFinalAmount() != null ? String.format("%.2f", recipient.getFinalAmount()) : "0.00");
    }

    // Helper methods
    private boolean isMailEnabled() {
        return mailEnabled && mailSender != null;
    }

    private String buildPasswordResetEmail(String name, String resetToken) {
        return String.format("""
            Hello %s,
            
            We received a request to reset your password for your AssetFlow account.
            
            Click the link below to reset your password:
            http://localhost:5174/reset-password?token=%s
            
            This link will expire in 1 hour.
            
            If you didn't request a password reset, please ignore this email.
            
            Best regards,
            AssetFlow Team
            """, name, resetToken);
    }

    private String buildWelcomeEmail(String name) {
        return String.format("""
            Hello %s,
            
            Welcome to AssetFlow!
            
            Your account has been successfully created. You can now log in and start managing your assets.
            
            If you have any questions, please don't hesitate to contact us.
            
            Best regards,
            AssetFlow Team
            """, name);
    }
}