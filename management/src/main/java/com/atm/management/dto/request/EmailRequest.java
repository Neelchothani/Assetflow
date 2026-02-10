package com.atm.management.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailRequest {

    @NotEmpty(message = "At least one recipient is required")
    @Valid
    private List<EmailRecipient> recipients;

    @NotBlank(message = "Subject is required")
    private String subject;

    @NotBlank(message = "Email body is required")
    private String body;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmailRecipient {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        private String name; // Optional
    }
}