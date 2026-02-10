package com.atm.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UploadedFileResponse {
    private Long id;
    private String originalFilename;
    private Long fileSize;
    private String contentType;
    private String fileType;
    private Integer totalRows;
    private Integer uniqueVendors;
    private Integer vendorsCreated;
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;
    private String notes;
}