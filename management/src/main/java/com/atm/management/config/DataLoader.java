package com.atm.management.config;

import com.atm.management.model.User;
import com.atm.management.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataLoader {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner loadTestData() {
        return args -> {
            // Check if test users already exist
            if (userRepository.existsByEmail("admin@assetflow.com")) {
                log.info("Test data already exists, skipping initialization");
                return;
            }

            log.info("=== Creating Test Users ===");

            // Create Admin User
            User admin = new User();
            admin.setName("Admin User");
            admin.setEmail("admin@assetflow.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole(User.UserRole.ADMIN);
            admin.setCompany("AssetFlow Inc");
            admin.setPhone("+1234567890");
            admin.setIsActive(true);
            admin.setCreatedAt(LocalDateTime.now());
            userRepository.save(admin);
            log.info("Created admin user: {}", admin.getEmail());

            // Create Manager User
            User manager = new User();
            manager.setName("Manager User");
            manager.setEmail("manager@assetflow.com");
            manager.setPassword(passwordEncoder.encode("manager123"));
            manager.setRole(User.UserRole.MANAGER);
            manager.setCompany("AssetFlow Inc");
            manager.setPhone("+1234567891");
            manager.setIsActive(true);
            manager.setCreatedAt(LocalDateTime.now());
            userRepository.save(manager);
            log.info("Created manager user: {}", manager.getEmail());

            // Create Vendor User
            User vendor = new User();
            vendor.setName("Vendor User");
            vendor.setEmail("vendor@assetflow.com");
            vendor.setPassword(passwordEncoder.encode("vendor123"));
            vendor.setRole(User.UserRole.VENDOR);
            vendor.setCompany("Vendor Co");
            vendor.setPhone("+1234567892");
            vendor.setIsActive(true);
            vendor.setCreatedAt(LocalDateTime.now());
            userRepository.save(vendor);
            log.info("Created vendor user: {}", vendor.getEmail());

            log.info("=== Test Users Created Successfully ===");
            log.info("Admin - Email: admin@assetflow.com, Password: admin123");
            log.info("Manager - Email: manager@assetflow.com, Password: manager123");
            log.info("Vendor - Email: vendor@assetflow.com, Password: vendor123");
        };
    }
}