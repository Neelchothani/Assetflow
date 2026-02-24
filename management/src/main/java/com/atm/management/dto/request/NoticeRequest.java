package com.atm.management.dto.request;

import lombok.Data;

import java.time.LocalDate;

@Data
public class NoticeRequest {
    private String title;
    private String description;
    private String priority;
    private String createdBy;
    private LocalDate expiryDate;
}
