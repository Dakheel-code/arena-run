-- Add city column to view_sessions table
ALTER TABLE view_sessions ADD COLUMN IF NOT EXISTS city TEXT;
