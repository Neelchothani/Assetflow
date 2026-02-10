package com.atm.management.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Utility class to generate and verify BCrypt password hashes
 * Run this as a standalone Java class to generate password hashes for your users
 */
public class PasswordHashGenerator {

    public static void main(String[] args) {
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

        // Generate hashes for test passwords
        String[] passwords = {"admin123", "manager123", "vendor123", "password123"};

        System.out.println("=== BCrypt Password Hash Generator ===\n");

        for (String password : passwords) {
            String hash = passwordEncoder.encode(password);
            System.out.println("Password: " + password);
            System.out.println("Hash:     " + hash);
            System.out.println("Verify:   " + passwordEncoder.matches(password, hash));
            System.out.println();
        }

        // Verify the hashes from the SQL script
        System.out.println("=== Verifying SQL Script Hashes ===\n");

        String adminHash = "$2a$10$XQ5vGEL5KKEwQKvvBcRHKOvFPvPvKGYYcL3kl3WY9OGGxN5xHxHxe";
        String managerHash = "$2a$10$8tI3d2z8K5vE9n3.rE7FOu9zZk0A7K5qY6aB8C9D0E1F2G3H4I5J6";
        String vendorHash = "$2a$10$9uJ4e3a9L6wF0o4.sF8GPv0aAl1B8L6rZ7bC9D1E2F3G4H5I6J7K8";

        System.out.println("Testing admin123 with SQL hash:");
        System.out.println("Match: " + passwordEncoder.matches("admin123", adminHash));

        System.out.println("\nTesting manager123 with SQL hash:");
        System.out.println("Match: " + passwordEncoder.matches("manager123", managerHash));

        System.out.println("\nTesting vendor123 with SQL hash:");
        System.out.println("Match: " + passwordEncoder.matches("vendor123", vendorHash));

        // Note: The hashes in the SQL are examples and may not actually match
        // You should generate fresh hashes using this utility
        System.out.println("\n=== IMPORTANT ===");
        System.out.println("If the above matches show 'false', you need to:");
        System.out.println("1. Generate new hashes using this utility");
        System.out.println("2. Update the INSERT statements in your SQL script");
        System.out.println("3. Or use Spring Boot to create users programmatically");
    }
}