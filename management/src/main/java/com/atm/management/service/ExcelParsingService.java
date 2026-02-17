package com.atm.management.service;

import com.atm.management.dto.response.VendorDataResponse;
import com.atm.management.model.EmailRecipient;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ExcelParsingService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    );

    /**
     * Parse Excel file and extract all rows with vendor information
     * Email validation is optional - returns all rows regardless
     */
    public VendorDataResponse parseAndValidateExcelFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return new VendorDataResponse(false, 0, 0, Collections.emptyList(), Collections.emptyList(), "File is empty or null");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            return new VendorDataResponse(false, 0, 0, Collections.emptyList(), Collections.emptyList(), "Invalid file format. Please upload .xlsx or .xls file");
        }

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);
            List<EmailRecipient> allRecipients = new ArrayList<>();
            List<String> warnings = new ArrayList<>();
            Map<String, Set<Integer>> vendorRowMap = new HashMap<>();
            int totalRows = 0;

            // Skip header row (row 0)
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                totalRows++;
                try {
                    EmailRecipient recipient = parseRow(row, i);

                    // Validate vendor name exists
                    if (recipient.getVendorName() == null || recipient.getVendorName().trim().isEmpty()) {
                        warnings.add(String.format("Row %d: Vendor name is missing", i + 1));
                        recipient.setVendorName("Unknown");
                    }

                    // Track vendor rows
                    String vendorName = recipient.getVendorName();
                    vendorRowMap.computeIfAbsent(vendorName, k -> new HashSet<>()).add(i + 1);

                    // Look for email in the row (optional)
                    String foundEmail = findEmailInRow(row);

                    if (foundEmail != null && isValidEmail(foundEmail)) {
                        recipient.setVendorEmail(foundEmail);
                    } else {
                        // No email found - add as warning but still include the recipient
                        warnings.add(String.format("Row %d (%s): No email address found in row (email column may be missing)",
                                i + 1, recipient.getVendorName()));
                        recipient.setVendorEmail(null);
                    }

                    // Add all recipients regardless of email presence
                    allRecipients.add(recipient);

                } catch (Exception e) {
                    log.error("Error parsing row {}", i, e);
                    warnings.add(String.format("Row %d: Error parsing row: %s", i + 1, e.getMessage()));
                }
            }

            // Build vendor info list
            List<VendorDataResponse.VendorInfo> vendorInfos = vendorRowMap.entrySet().stream()
                    .map(entry -> new VendorDataResponse.VendorInfo(
                            entry.getKey(),
                            entry.getValue().size(),
                            new ArrayList<>(entry.getValue())
                    ))
                    .sorted((a, b) -> Integer.compare(b.getRowCount(), a.getRowCount())) // Sort by row count descending
                    .collect(Collectors.toList());

            // Build summary message
            String message = buildSummaryMessage(totalRows, vendorRowMap.size(), warnings.size());

            log.info("Excel parsing completed: {} total rows, {} unique vendors, {} warnings",
                    totalRows, vendorRowMap.size(), warnings.size());

            // Return success if we have any data
            return new VendorDataResponse(
                    totalRows > 0,
                    totalRows,
                    vendorRowMap.size(),
                    vendorInfos,
                    warnings,
                    message
            );

        } catch (Exception e) {
            log.error("Error parsing Excel file", e);
            return new VendorDataResponse(false, 0, 0, Collections.emptyList(),
                    Collections.singletonList("Error parsing Excel file: " + e.getMessage()),
                    "Error parsing Excel file: " + e.getMessage());
        }
    }

    /**
     * Build summary message based on parsing results
     */
    private String buildSummaryMessage(int totalRows, int uniqueVendors, int warningCount) {
        StringBuilder message = new StringBuilder();

        message.append(String.format("Successfully parsed %d rows from Excel file. ", totalRows));
        message.append(String.format("Found %d unique vendors. ", uniqueVendors));

        if (warningCount > 0) {
            message.append(String.format("%d warnings were generated during parsing. ", warningCount));
        }

        message.append("Vendor data has been extracted and is ready for use.");

        return message.toString();
    }

    private EmailRecipient parseRow(Row row, int rowIndex) {
        return EmailRecipient.builder()
                .sNo(getCellValueAsInteger(row.getCell(0)))
                .provisionMonth(normalizeProvisionMonth(getCellValueAsString(row.getCell(1))))
                .atmBnaId(getCellValueAsString(row.getCell(2)))
                .docketNo(getCellValueAsString(row.getCell(3)))
                .bankName(getCellValueAsString(row.getCell(4)))
                .fromLocation(getCellValueAsString(row.getCell(5)))
                .fromState(getCellValueAsString(row.getCell(6)))
                .toLocation(getCellValueAsString(row.getCell(7)))
                .toState(getCellValueAsString(row.getCell(8)))
                .businessGroup(getCellValueAsString(row.getCell(9)))
                .modeOfBill(getCellValueAsString(row.getCell(10)))
                .typeOfMovement(getCellValueAsString(row.getCell(11)))
                .assetsServiceDescription(getCellValueAsString(row.getCell(12)))
                .totalCost(getCellValueAsDouble(row.getCell(13)))
                .hold(getCellValueAsDouble(row.getCell(14)))
                .deduction(getCellValueAsDouble(row.getCell(15)))
                .finalAmount(getCellValueAsDouble(row.getCell(16)))
                .perAssetCost(getCellValueAsDouble(row.getCell(17)))             // Column R - Vendor Cost
                // Columns S (18) and T (19) are reserved - left empty for future use
                // All columns after R (column 17) shifted by 2 positions to the right
                .assetsDeliveryPending(getCellValueAsString(row.getCell(20)))        // Column U
                .reasonForAdditionalCharges(getCellValueAsString(row.getCell(21)))  // Column V
                .pickUpDate(getCellValueAsString(row.getCell(22)))                   // Column W
                .status(getCellValueAsString(row.getCell(23)))                       // Column X - Asset Status
                .date(getCellValueAsString(row.getCell(24)))                         // Column Y
                .vendorName(getCellValueAsString(row.getCell(25)))                   // Column Z - Vendor Name
                .freightCategory(getCellValueAsString(row.getCell(26)))              // Column AA
                .invoiceNo(getCellValueAsString(row.getCell(28)))                    // Column AC - Invoice No
                .billingMonth(getCellValueAsString(row.getCell(29)))                 // Column AD
                .billing(getCellValueAsString(row.getCell(30)))                      // Column AE - Billing Status
                .vendor(getCellValueAsString(row.getCell(25)))                      // Backup vendor field for compatibility
                .build();
    }

    /**
     * Find email address in any cell of the row
     */
    private String findEmailInRow(Row row) {
        if (row == null) {
            return null;
        }

        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null) {
                String cellValue = getCellValueAsString(cell);
                if (cellValue != null && !cellValue.trim().isEmpty()) {
                    // Check if entire cell is an email
                    String cleaned = cellValue.trim().replaceAll("[,;:()\\[\\]{}]+$", "");
                    if (EMAIL_PATTERN.matcher(cleaned).matches()) {
                        return cleaned.toLowerCase();
                    }

                    // Check each word/token in the cell
                    String[] tokens = cellValue.split("\\s+");
                    for (String token : tokens) {
                        token = token.trim().replaceAll("[,;:()\\[\\]{}]+$", "");
                        if (EMAIL_PATTERN.matcher(token).matches()) {
                            return token.toLowerCase();
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * Check if email is valid
     */
    private boolean isValidEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        return EMAIL_PATTERN.matcher(email.trim()).matches();
    }

    /**
     * Get cell value as String, with special handling for provisionMonth
     */
    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return null;
        }

        try {
            switch (cell.getCellType()) {
                case STRING:
                    return cell.getStringCellValue().trim();
                case NUMERIC:
                    if (DateUtil.isCellDateFormatted(cell)) {
                        // Special handling for provisionMonth (column 1)
                        // Keep it in "Mon-YY" format instead of ISO date format
                        if (cell.getColumnIndex() == 1) {
                            java.util.Date date = cell.getDateCellValue();
                            java.time.LocalDate localDate = date.toInstant()
                                    .atZone(java.time.ZoneId.systemDefault())
                                    .toLocalDate();
                            // Format as "Mon-YY" (e.g., "Nov-25")
                            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("MMM-yy");
                            return localDate.format(formatter);
                        }
                        
                        // For other date columns, convert to ISO format (YYYY-MM-DD)
                        java.util.Date date = cell.getDateCellValue();
                        java.time.LocalDate localDate = date.toInstant()
                                .atZone(java.time.ZoneId.systemDefault())
                                .toLocalDate();
                        return localDate.toString();
                    }
                    double numValue = cell.getNumericCellValue();
                    if (numValue == Math.floor(numValue)) {
                        return String.valueOf((long) numValue);
                    }
                    return String.valueOf(numValue);
                case BOOLEAN:
                    return String.valueOf(cell.getBooleanCellValue());
                case FORMULA:
                    try {
                        return cell.getStringCellValue().trim();
                    } catch (Exception e) {
                        return String.valueOf(cell.getNumericCellValue());
                    }
                case BLANK:
                    return null;
                default:
                    return null;
            }
        } catch (Exception e) {
            log.warn("Error reading cell value as string at row {}, column {}",
                    cell.getRowIndex(), cell.getColumnIndex());
            return null;
        }
    }

    /**
     * Get cell value as Integer
     */
    private Integer getCellValueAsInteger(Cell cell) {
        if (cell == null) {
            return null;
        }

        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                return (int) cell.getNumericCellValue();
            } else if (cell.getCellType() == CellType.STRING) {
                String value = cell.getStringCellValue().trim();
                return value.isEmpty() ? null : Integer.parseInt(value);
            }
        } catch (Exception e) {
            log.warn("Error reading cell value as integer", e);
        }
        return null;
    }

    /**
     * Get cell value as Double
     */
    private Double getCellValueAsDouble(Cell cell) {
        if (cell == null) {
            return null;
        }

        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                return cell.getNumericCellValue();
            } else if (cell.getCellType() == CellType.STRING) {
                String value = cell.getStringCellValue().trim()
                        .replaceAll("[^0-9.-]", "");
                return value.isEmpty() ? null : Double.parseDouble(value);
            }
        } catch (Exception e) {
            log.warn("Error reading cell value as double", e);
        }
        return null;
    }

    /**
     * Normalize provision month format to "Mon-YY" (e.g., "Sep-25", "Oct-25")
     * Handles both formats: "Sep-25" and "Sep'25" or "Sep'25" and converts them to "Sep-25"
     */
    private String normalizeProvisionMonth(String provisionMonth) {
        if (provisionMonth == null || provisionMonth.trim().isEmpty()) {
            return null;
        }

        String normalized = provisionMonth.trim();
        
        // Replace apostrophe with hyphen: "Oct'25" -> "Oct-25"
        normalized = normalized.replace("'", "-");
        
        // Also handle other variations
        normalized = normalized.replace("_", "-");
        
        log.debug("Normalized provision month: {} -> {}", provisionMonth, normalized);
        return normalized;
    }

    /**
     * Check if row is empty
     */
    private boolean isRowEmpty(Row row) {
        if (row == null) {
            return true;
        }

        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String value = getCellValueAsString(cell);
                if (value != null && !value.trim().isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Get list of all recipients with their email status
     */
    public List<EmailRecipient> extractAllRecipients(MultipartFile file) {
        List<EmailRecipient> recipients = new ArrayList<>();

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                try {
                    EmailRecipient recipient = parseRow(row, i);
                    String email = findEmailInRow(row);
                    recipient.setVendorEmail(email);

                    if (recipient.getVendorName() == null || recipient.getVendorName().trim().isEmpty()) {
                        recipient.setVendorName("Unknown");
                    }

                    recipients.add(recipient);
                } catch (Exception e) {
                    log.error("Error parsing row {}", i, e);
                }
            }
        } catch (Exception e) {
            log.error("Error extracting recipients from Excel", e);
        }

        return recipients;
    }

    /**
     * Get unique vendor names from the Excel file
     */
    public Map<String, List<Integer>> getVendorRowMapping(MultipartFile file) {
        Map<String, List<Integer>> vendorRowMap = new HashMap<>();

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                try {
                    String vendorName = getCellValueAsString(row.getCell(25)); // Vendor Name column (index 25 = Column Z)
                    if (vendorName != null && !vendorName.trim().isEmpty()) {
                        vendorRowMap.computeIfAbsent(vendorName, k -> new ArrayList<>()).add(i + 1);
                    }
                } catch (Exception e) {
                    log.error("Error reading vendor name from row {}", i, e);
                }
            }
        } catch (Exception e) {
            log.error("Error getting vendor row mapping", e);
        }

        return vendorRowMap;
    }
}