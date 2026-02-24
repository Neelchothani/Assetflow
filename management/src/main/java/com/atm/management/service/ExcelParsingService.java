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
            Map<String, Integer> colMap = buildColumnIndexMap(sheet);
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
                    EmailRecipient recipient = parseRow(row, i, colMap);

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

    /**
     * Build a normalized header name -> column index map from the sheet's first row.
     * Normalization: lowercase, letters and digits only (strips spaces and special chars).
     */
    private Map<String, Integer> buildColumnIndexMap(Sheet sheet) {
        Map<String, Integer> map = new HashMap<>();
        Row headerRow = sheet.getRow(0);
        if (headerRow == null) return map;
        for (int i = 0; i < headerRow.getLastCellNum(); i++) {
            Cell cell = headerRow.getCell(i);
            if (cell != null) {
                String raw = getCellValueAsString(cell);
                if (raw != null && !raw.isBlank()) {
                    String normalized = raw.toLowerCase().replaceAll("[^a-z0-9]", "");
                    map.putIfAbsent(normalized, i); // keep first occurrence
                }
            }
        }
        log.debug("Column map built: {}", map);
        return map;
    }

    /**
     * Find a column index by trying normalized key names in order.
     * Returns fallback if none found.
     */
    private int findCol(Map<String, Integer> colMap, int fallback, String... normalizedKeys) {
        for (String key : normalizedKeys) {
            if (colMap.containsKey(key)) return colMap.get(key);
        }
        return fallback;
    }

    /**
     * Find a column index by prefix match (e.g. "billingmonth" matches "billingmonthnecessary").
     * Returns fallback if none found.
     */
    private int findColByPrefix(Map<String, Integer> colMap, int fallback, String prefix) {
        return colMap.entrySet().stream()
                .filter(e -> e.getKey().startsWith(prefix))
                .mapToInt(Map.Entry::getValue)
                .findFirst()
                .orElse(fallback);
    }

    /**
     * Find a column index by prefix match, optionally excluding a sub-prefix.
     * e.g. prefix="billing", exclude="billingmonth" → finds "billing" or "billingstatus" but not "billingmonth"
     */
    private int findColByPrefixExcluding(Map<String, Integer> colMap, int fallback, String prefix, String... excludePrefixes) {
        return colMap.entrySet().stream()
                .filter(e -> {
                    String k = e.getKey();
                    if (!k.startsWith(prefix)) return false;
                    for (String ex : excludePrefixes) {
                        if (k.startsWith(ex)) return false;
                    }
                    return true;
                })
                .mapToInt(Map.Entry::getValue)
                .findFirst()
                .orElse(fallback);
    }

    private EmailRecipient parseRow(Row row, int rowIndex, Map<String, Integer> colMap) {
        // --- Columns A-R (index 0-17) are identical in all file formats ---
        EmailRecipient.EmailRecipientBuilder builder = EmailRecipient.builder()
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
                .perAssetCost(getCellValueAsDouble(row.getCell(17)));  // Column R

        // --- Columns S+ vary by file format; use header-based detection ---

        // Pick Up Date: Hitachi="Pick Up Date"(W/22), NCR="Pickup Date"(U/20)
        // Both normalize to "pickupdate"
        int pickupIdx = findCol(colMap, 22, "pickupdate", "pickup");
        builder.pickUpDate(getCellValueAsString(row.getCell(pickupIdx)));

        // Asset Status: "Status" in both files (different column positions)
        // Use exact match so we don't accidentally match "Billing Status"
        int statusIdx = findCol(colMap, 23, "status");
        builder.status(getCellValueAsString(row.getCell(statusIdx)));

        // Vendor Name: "Vendor Name" in both files
        int vendorNameIdx = findCol(colMap, 25, "vendorname");
        builder.vendorName(getCellValueAsString(row.getCell(vendorNameIdx)));
        builder.vendor(getCellValueAsString(row.getCell(vendorNameIdx)));

        // Freight Category: only in Hitachi (AA/26)
        int freightIdx = findCol(colMap, 26, "freightcategory", "freight");
        builder.freightCategory(getCellValueAsString(row.getCell(freightIdx)));

        // Invoice No: Hitachi AC(28), may differ in NCR
        int invoiceIdx = findCol(colMap, 28, "invoiceno", "invoice");
        builder.invoiceNo(getCellValueAsString(row.getCell(invoiceIdx)));

        // Billing Month: "Billing Month" or "Billing Month (necessary)" → prefix "billingmonth"
        int billingMonthIdx = findColByPrefix(colMap, 29, "billingmonth");
        builder.billingMonth(getCellValueAsString(row.getCell(billingMonthIdx)));

        // Billing Status: "Billing" (Hitachi AE/30) or "Billing Status..." (NCR AC/28)
        // Use prefix "billing" but exclude "billingmonth"
        int billingIdx = findColByPrefixExcluding(colMap, 30, "billing", "billingmonth");
        builder.billing(getCellValueAsString(row.getCell(billingIdx)));

        // Delivery Date: "Delivery Date" (NCR AE/30 only) — optional, null for Hitachi
        Integer deliveryDateIdx = colMap.get("deliverydate");
        if (deliveryDateIdx != null) {
            builder.deliveryDate(getCellValueAsString(row.getCell(deliveryDateIdx)));
        }

        // Amount Received: column AG (index 32) — "Received" or "Not received"
        Integer amountReceivedIdx = colMap.get("amountreceived");
        if (amountReceivedIdx != null) {
            builder.amountReceived(getCellValueAsString(row.getCell(amountReceivedIdx)));
        } else {
            // Fallback to fixed index 32 (AG)
            Cell arCell = row.getCell(32);
            if (arCell != null) {
                String val = getCellValueAsString(arCell);
                if (val != null && (val.equalsIgnoreCase("Received") || val.toLowerCase().contains("not received"))) {
                    builder.amountReceived(val);
                }
            }
        }

        // Remaining fields (less critical, keep fallback indices)
        builder.assetsDeliveryPending(getCellValueAsString(row.getCell(
                findCol(colMap, 20, "assetsdeliverypending"))));
        builder.reasonForAdditionalCharges(getCellValueAsString(row.getCell(
                findCol(colMap, 21, "reasonforadditionalcharges", "additionalreason"))));
        builder.date(getCellValueAsString(row.getCell(
                findCol(colMap, 24, "date"))));

        return builder.build();
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
            Map<String, Integer> colMap = buildColumnIndexMap(sheet);

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                try {
                    EmailRecipient recipient = parseRow(row, i, colMap);
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