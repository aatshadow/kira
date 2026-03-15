-- ============================================================
-- KIRA — User Profile AI (Intelligent Profile)
-- Date: 2026-03-15
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profile_ai (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,

  -- Structured profile sections
  work_patterns   JSONB DEFAULT '{}',
  productivity    JSONB DEFAULT '{}',
  habits_analysis JSONB DEFAULT '{}',
  personality     JSONB DEFAULT '{}',
  strengths       TEXT[] DEFAULT '{}',
  improvement_areas TEXT[] DEFAULT '{}',

  -- Full narrative profile (injected into system prompt)
  narrative       TEXT,

  -- Metadata
  data_points     INT DEFAULT 0,
  last_analyzed   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profile_ai ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own profile_ai" ON user_profile_ai
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_profile_ai_user
  ON user_profile_ai(user_id);
