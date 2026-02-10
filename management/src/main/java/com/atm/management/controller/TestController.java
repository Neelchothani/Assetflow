package com.atm.management.controller;

import com.atm.management.model.User;
import com.atm.management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * IMPORTANT: This controller is for testing/debugging only.
 * DELETE or COMMENT OUT before deploying to production!
 */
@Slf4j
@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TestController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/health")
    public Map<String, String> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now().toString());
        return response;
    }

    @GetMapping("/db-check")
    public Map<String, Object> checkDatabase() {
        Map<String, Object> response = new HashMap<>();

        try {
            long userCount = userRepository.count();
            response.put("status", "connected");
            response.put("userCount", userCount);
            response.put("message", "Database connection successful");
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", e.getMessage());
            log.error("Database check failed", e);
        }

        return response;
    }

    @GetMapping("/users")
    public Map<String, Object> listUsers() {
        Map<String, Object> response = new HashMap<>();

        try {
            var users = userRepository.findAll();
            response.put("count", users.size());
            response.put("users", users.stream().map(u -> Map.of(
                    "id", u.getId(),
                    "email", u.getEmail(),
                    "name", u.getName(),
                    "role", u.getRole().name(),
                    "isActive", u.getIsActive()
            )).toList());
        } catch (Exception e) {
            response.put("error", e.getMessage());
            log.error("Failed to list users", e);
        }

        return response;
    }

    @GetMapping("/encode-password")
    public Map<String, String> encodePassword(@RequestParam String password) {
        Map<String, String> response = new HashMap<>();

        try {
            String encoded = passwordEncoder.encode(password);
            response.put("original", password);
            response.put("encoded", encoded);
            response.put("message", "Password encoded successfully");

            log.info("Encoded password: {} -> {}", password, encoded);
        } catch (Exception e) {
            response.put("error", e.getMessage());
            log.error("Failed to encode password", e);
        }

        return response;
    }

    @GetMapping("/verify-password")
    public Map<String, Object> verifyPassword(
            @RequestParam String email,
            @RequestParam String password) {

        Map<String, Object> response = new HashMap<>();

        try {
            var userOpt = userRepository.findByEmail(email);

            if (userOpt.isEmpty()) {
                response.put("found", false);
                response.put("message", "User not found");
                return response;
            }

            User user = userOpt.get();
            boolean matches = passwordEncoder.matches(password, user.getPassword());

            response.put("found", true);
            response.put("email", user.getEmail());
            response.put("role", user.getRole().name());
            response.put("isActive", user.getIsActive());
            response.put("passwordMatches", matches);
            response.put("message", matches ? "Password matches" : "Password does not match");

            log.info("Password verification for {}: {}", email, matches);
        } catch (Exception e) {
            response.put("error", e.getMessage());
            log.error("Failed to verify password", e);
        }

        return response;
    }

    @PostMapping("/create-test-user")
    public Map<String, Object> createTestUser() {
        Map<String, Object> response = new HashMap<>();

        try {
            // Check if already exists
            if (userRepository.existsByEmail("admin@assetflow.com")) {
                response.put("message", "Test user already exists");
                return response;
            }

            User admin = new User();
            admin.setName("Admin User");
            admin.setEmail("admin@assetflow.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole(User.UserRole.ADMIN);
            admin.setCompany("AssetFlow Inc");
            admin.setPhone("+1234567890");
            admin.setIsActive(true);
            admin.setCreatedAt(LocalDateTime.now());

            User saved = userRepository.save(admin);

            response.put("success", true);
            response.put("user", Map.of(
                    "id", saved.getId(),
                    "email", saved.getEmail(),
                    "name", saved.getName(),
                    "role", saved.getRole().name()
            ));
            response.put("message", "Test user created successfully");
            response.put("credentials", "Email: admin@assetflow.com, Password: admin123");

            log.info("Test user created successfully");
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            log.error("Failed to create test user", e);
        }

        return response;
    }

    @GetMapping("/check-user")
    public Map<String, Object> checkUser(@RequestParam String email) {
        Map<String, Object> response = new HashMap<>();

        try {
            var userOpt = userRepository.findByEmail(email);

            if (userOpt.isEmpty()) {
                response.put("exists", false);
                response.put("message", "User not found");
            } else {
                User user = userOpt.get();
                response.put("exists", true);
                response.put("user", Map.of(
                        "id", user.getId(),
                        "email", user.getEmail(),
                        "name", user.getName(),
                        "role", user.getRole().name(),
                        "isActive", user.getIsActive(),
                        "hasPassword", user.getPassword() != null && !user.getPassword().isEmpty()
                ));
            }
        } catch (Exception e) {
            response.put("error", e.getMessage());
            log.error("Failed to check user", e);
        }

        return response;
    }
}