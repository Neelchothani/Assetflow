-- Baseline migration to set flyway baseline (this represents the current schema state)
-- This allows Flyway to track migrations starting from this point
-- In production, use: flyway baseline command or adjust spring.flyway.baselineVersion
SELECT 1; -- Dummy statement as this is just a marker
