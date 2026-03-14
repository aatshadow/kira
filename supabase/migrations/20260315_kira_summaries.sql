-- KIRA Summaries table for AI-generated daily/weekly/monthly summaries
CREATE TABLE IF NOT EXISTS kira_summaries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  period        TEXT CHECK (period IN ('daily','weekly','monthly')) NOT NULL,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  content       TEXT NOT NULL,
  metrics       JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period)
);

ALTER TABLE kira_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own summaries" ON kira_summaries FOR ALL USING (auth.uid() = user_id);
