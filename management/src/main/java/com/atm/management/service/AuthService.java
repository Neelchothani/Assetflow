package com.atm.management.service;

import com.atm.management.dto.request.LoginRequest;
import com.atm.management.dto.request.RegisterRequest;
import com.atm.management.dto.response.AuthResponse;
import com.atm.management.dto.response.UserResponse;
import com.atm.management.exception.AuthenticationException;
import com.atm.management.exception.ResourceNotFoundException;
import com.atm.management.model.User;
import com.atm.management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("=== LOGIN ATTEMPT START ===");
        log.info("Email: {}", request.getEmail());
        log.info("Password length: {}", request.getPassword() != null ? request.getPassword().length() : 0);

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    log.error("User not found with email: {}", request.getEmail());
                    return new AuthenticationException("Invalid email or password");
                });

        log.info("User found in database:");
        log.info("  - Email: {}", user.getEmail());
        log.info("  - Name: {}", user.getName());
        log.info("  - Role: {}", user.getRole());
        log.info("  - Active: {}", user.getIsActive());
        log.info("  - Stored password hash: {}", user.getPassword().substring(0, 20) + "...");

        // Verify password
        log.info("Verifying password...");
        boolean passwordMatches = passwordEncoder.matches(request.getPassword(), user.getPassword());
        log.info("Password match result: {}", passwordMatches);

        if (!passwordMatches) {
            log.error("Password verification failed for email: {}", request.getEmail());
            throw new AuthenticationException("Invalid email or password");
        }

        // Verify user is active
        if (!user.getIsActive()) {
            log.warn("Login attempt for deactivated account: {}", request.getEmail());
            throw new AuthenticationException("Account is deactivated. Please contact administrator.");
        }

        // Update last login
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        // Generate JWT token
        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());

        UserResponse userResponse = mapToUserResponse(user);

        log.info("✓ Successful login for user: {}", request.getEmail());
        log.info("=== LOGIN ATTEMPT END ===");
        return new AuthResponse(token, "Bearer", userResponse);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        log.info("=== REGISTRATION ATTEMPT START ===");
        log.info("Email: {}", request.getEmail());
        log.info("Name: {}", request.getName());
        log.info("Password length: {}", request.getPassword() != null ? request.getPassword().length() : 0);

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Registration failed - Email already exists: {}", request.getEmail());
            throw new IllegalArgumentException("Email already registered");
        }

        // Validate password
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters long");
        }

        log.info("Encoding password...");
        String encodedPassword = passwordEncoder.encode(request.getPassword());
        log.info("Password encoded successfully. Hash: {}", encodedPassword.substring(0, 20) + "...");

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(encodedPassword);
        user.setRole(User.UserRole.ADMIN); // Always set to ADMIN
        user.setCompany(request.getCompany());
        user.setPhone(request.getPhone());
        user.setIsActive(true);
        user.setCreatedAt(LocalDateTime.now());

        try {
            User savedUser = userRepository.save(user);
            log.info("User saved to database with ID: {}", savedUser.getId());

            // Generate JWT token
            String token = jwtService.generateToken(savedUser.getEmail(), savedUser.getRole().name());

            UserResponse userResponse = mapToUserResponse(savedUser);

            log.info("✓ Successful registration for user: {}", request.getEmail());
            log.info("=== REGISTRATION ATTEMPT END ===");
            return new AuthResponse(token, "Bearer", userResponse);
        } catch (Exception e) {
            log.error("Error during user registration: ", e);
            throw new RuntimeException("Registration failed. Please try again later.");
        }
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String token) {
        String email = jwtService.extractEmail(token);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return mapToUserResponse(user);
    }

    public AuthResponse refreshToken(String token) {
        // Verify token is valid
        if (!jwtService.validateToken(token)) {
            throw new AuthenticationException("Invalid or expired token");
        }

        String email = jwtService.extractEmail(token);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Generate new token
        String newToken = jwtService.generateToken(user.getEmail(), user.getRole().name());

        UserResponse userResponse = mapToUserResponse(user);

        return new AuthResponse(newToken, "Bearer", userResponse);
    }

    public boolean verifyToken(String token) {
        try {
            return jwtService.validateToken(token);
        } catch (Exception e) {
            log.error("Token verification failed: ", e);
            return false;
        }
    }

    @Transactional
    public void changePassword(String token, String currentPassword, String newPassword) {
        String email = jwtService.extractEmail(token);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Verify current password
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new AuthenticationException("Current password is incorrect");
        }

        // Validate new password
        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters long");
        }

        // Update password
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        log.info("Password changed successfully for user: {}", email);
    }

    public void sendPasswordResetEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No account found with this email"));

        // Generate password reset token (valid for 1 hour)
        String resetToken = jwtService.generatePasswordResetToken(email);

        // TODO: Send email with reset link
        // For now, we'll just log it (in production, use JavaMailSender)
        log.info("Password Reset Token for {}: {}", email, resetToken);
        log.info("Reset link: http://localhost:5173/reset-password?token={}", resetToken);

        // In production, you would send an email like this:
        // emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), resetToken);
    }

    @Transactional
    public void resetPassword(String resetToken, String newPassword) {
        // Verify reset token
        if (!jwtService.validateToken(resetToken)) {
            throw new AuthenticationException("Invalid or expired reset token");
        }

        String email = jwtService.extractEmail(resetToken);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Validate new password
        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters long");
        }

        // Update password
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        log.info("Password reset successfully for user: {}", email);
    }

    @Transactional(readOnly = true)
    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    @Transactional
    public UserResponse updateProfile(String token, String name, String email, String phone, String department, String avatarUrl) {
        String extractedEmail = jwtService.extractEmail(token);

        User user = userRepository.findByEmail(extractedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (name != null && !name.isEmpty()) {
            user.setName(name);
        }
        if (email != null && !email.isEmpty() && !email.equals(user.getEmail())) {
            if (userRepository.existsByEmail(email)) {
                throw new IllegalArgumentException("Email already in use");
            }
            user.setEmail(email);
        }
        if (phone != null && !phone.isEmpty()) {
            user.setPhone(phone);
        }
        if (avatarUrl != null && !avatarUrl.isEmpty()) {
            user.setAvatar(avatarUrl);
        }

        User savedUser = userRepository.save(user);
        return mapToUserResponse(savedUser);
    }

    // Helper method
    private UserResponse mapToUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getCompany(),
                user.getPhone(),
                user.getDepartment(),
                user.getAvatar()
        );
    }
}