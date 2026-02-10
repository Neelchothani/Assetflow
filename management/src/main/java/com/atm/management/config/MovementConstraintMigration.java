package com.atm.management.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class MovementConstraintMigration implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public MovementConstraintMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) throws Exception {
        try {
            log.info("Checking for legacy movement_type check constraint and dropping if present...");
            // Use IF EXISTS to avoid errors if constraint already removed
            jdbcTemplate.execute("ALTER TABLE movements DROP CONSTRAINT IF EXISTS movements_movement_type_check");
            log.info("Constraint check executed (if existed, dropped). Movement types can now be arbitrary strings.");
        } catch (Exception e) {
            log.warn("Failed to drop movements_movement_type_check constraint: {}", e.getMessage());
        }
    }
}
