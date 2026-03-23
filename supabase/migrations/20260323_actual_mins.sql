-- Add actual_mins column to tasks for manual time tracking
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_mins INT;
