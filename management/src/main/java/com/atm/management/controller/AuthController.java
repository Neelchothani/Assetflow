package com.atm.management.controller;

import com.atm.management.dto.request.ChangePasswordRequest;
import com.atm.management.dto.request.LoginRequest;
import com.atm.management.dto.request.RegisterRequest;
import com.atm.management.dto.request.ResetPasswordRequest;
import com.atm.management.dto.response.AuthResponse;
import com.atm.management.dto.response.MessageResponse;
import com.atm.management.dto.response.UserResponse;
import com.atm.management.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            log.info("=== Login Request Received ===");
            log.info("Email: {}", request.getEmail());
            log.info("Password length: {}", request.getPassword() != null ? request.getPassword().length() : 0);

            AuthResponse response = authService.login(request);

            log.info("Login successful for user: {}", request.getEmail());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Login failed for email: {} with error: {}", request.getEmail(), e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        try {
            log.info("=== Registration Request Received ===");
            log.info("Name: {}", request.getName());
            log.info("Email: {}", request.getEmail());
            log.info("Company: {}", request.getCompany());

            AuthResponse response = authService.register(request);

            log.info("Registration successful for user: {}", request.getEmail());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Registration failed for email: {} with error: {}", request.getEmail(), e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            UserResponse user = authService.getCurrentUser(token);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            log.error("Get current user failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PatchMapping("/me")
    public ResponseEntity<UserResponse> updateProfile(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) MultipartFile avatar) {
        try {
            String token = authHeader.replace("Bearer ", "");
            // Avatar upload temporarily disabled due to database column size constraint
            // Avatar will not be persisted, but other profile fields will be updated
            
            UserResponse updated = authService.updateProfile(token, name, email, phone, department, null);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Update profile failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            AuthResponse response = authService.refreshToken(token);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Token refresh failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<MessageResponse> verifyToken(
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            boolean isValid = authService.verifyToken(token);

            if (isValid) {
                return ResponseEntity.ok(new MessageResponse("Token is valid"));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new MessageResponse("Token is invalid or expired"));
            }
        } catch (Exception e) {
            log.error("Token verification failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Token verification failed"));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<MessageResponse> changePassword(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody ChangePasswordRequest request) {
        try {
            String token = authHeader.replace("Bearer ", "");
            authService.changePassword(token, request.getCurrentPassword(), request.getNewPassword());
            return ResponseEntity.ok(new MessageResponse("Password changed successfully"));
        } catch (Exception e) {
            log.error("Change password failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@RequestParam String email) {
        try {
            authService.sendPasswordResetEmail(email);
            return ResponseEntity.ok(
                    new MessageResponse("Password reset instructions sent to your email"));
        } catch (Exception e) {
            log.error("Forgot password failed for email: {} with error: {}", email, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<MessageResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request.getToken(), request.getNewPassword());
            return ResponseEntity.ok(new MessageResponse("Password reset successfully"));
        } catch (Exception e) {
            log.error("Reset password failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/check-email")
    public ResponseEntity<MessageResponse> checkEmail(@RequestParam String email) {
        try {
            boolean exists = authService.emailExists(email);
            if (exists) {
                return ResponseEntity.ok(new MessageResponse("Email is already registered"));
            } else {
                return ResponseEntity.ok(new MessageResponse("Email is available"));
            }
        } catch (Exception e) {
            log.error("Check email failed: {}", e.getMessage(), e);
            throw e;
        }
    }
}