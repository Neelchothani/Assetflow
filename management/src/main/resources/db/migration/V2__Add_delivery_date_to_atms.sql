-- Add delivery_date column to atms table
-- This stores the delivery date of each ATM (sourced from column AF of the Excel file)
ALTER TABLE atms ADD COLUMN IF NOT EXISTS delivery_date DATE;
