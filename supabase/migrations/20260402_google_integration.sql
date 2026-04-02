-- ============================================================
-- KIRA — Google Integration Migration
-- Date: 2026-04-02
-- Adds: missing OAuth columns, calendar sync tracking,
--        meeting source tracking, Meet URL support
-- ============================================================

-- 1. Missing OAuth token columns (code references them but migration never existed)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

-- 2. Calendar sync tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_calendar_sync TIMESTAMPTZ;

-- 3. Meeting source tracking (kira-native vs imported from Google Calendar)
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'kira';
ALTER TABLE meetings ADD CONSTRAINT meetings_source_check CHECK (source IN ('kira', 'google_calendar'));

-- 4. Google Meet URL for quick-join from UI
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS google_meet_url TEXT;

-- 5. Index for sync deduplication (calendar_event_id lookups)
CREATE INDEX IF NOT EXISTS idx_meetings_calendar_event ON meetings(calendar_event_id);
