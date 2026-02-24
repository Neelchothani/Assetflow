ALTER TABLE atms ADD COLUMN IF NOT EXISTS notice_generated BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: mark ATMs that already have an auto-generated notice so they are not re-created
UPDATE atms SET notice_generated = TRUE
WHERE id IN (SELECT DISTINCT atm_id FROM notices WHERE is_auto_generated = TRUE AND atm_id IS NOT NULL);
