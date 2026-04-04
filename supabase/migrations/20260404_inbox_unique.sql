-- Add unique constraint on inbox_messages for sync deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_inbox_messages_external
  ON inbox_messages(user_id, external_id)
  WHERE external_id IS NOT NULL;
