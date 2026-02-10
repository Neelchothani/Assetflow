-- Migration: Change avatar column from VARCHAR to TEXT to support base64 encoded images
ALTER TABLE users ALTER COLUMN avatar TYPE TEXT;

-- Add department column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);

