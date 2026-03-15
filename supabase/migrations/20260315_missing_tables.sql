-- ============================================================
-- KIRA — Missing Tables Migration
-- Date: 2026-03-15
-- Tables: chat_conversations, chat_messages, kira_memory,
--         habits, habit_logs
-- ============================================================

-- 1. CHAT CONVERSATIONS
CREATE TABLE IF NOT EXISTS chat_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Nueva conversación',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own conversations" ON chat_conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user
  ON chat_conversations(user_id, updated_at DESC);

-- 2. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role              TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content           TEXT NOT NULL,
  actions_executed  JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own messages" ON chat_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages(conversation_id, created_at ASC);

-- 3. KIRA MEMORY (persistent memory about the user)
CREATE TABLE IF NOT EXISTS kira_memory (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category                TEXT DEFAULT 'general',
  content                 TEXT NOT NULL,
  source_conversation_id  UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kira_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own memories" ON kira_memory
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_kira_memory_user
  ON kira_memory(user_id, updated_at DESC);

-- 4. HABITS
CREATE TABLE IF NOT EXISTS habits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  frequency     TEXT DEFAULT 'daily',
  target_time   TEXT,
  duration_mins INT,
  streak        INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own habits" ON habits
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);

-- 5. HABIT LOGS
CREATE TABLE IF NOT EXISTS habit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  habit_id      UUID REFERENCES habits(id) ON DELETE CASCADE,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_mins INT
);

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own habit_logs" ON habit_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user ON habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_completed
  ON habit_logs(completed_at);
