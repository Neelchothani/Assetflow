package com.atm.management.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailValidationResponse {
    private boolean valid;
    private int totalEmails;
    private int validEmails;
    private int invalidEmails;
    private List<String> validEmailList;
    private List<EmailError> errors;
    private String message;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmailError {
        private int row;
        private String email;
        private String error;
    }

    public EmailValidationResponse(boolean valid, String message) {
        this.valid = valid;
        this.message = message;
    }
}