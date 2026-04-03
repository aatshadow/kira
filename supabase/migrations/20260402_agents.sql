-- ============================================
-- KIRA Agents & Unified Inbox
-- ============================================

-- Agent configurations and connection status
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL,                          -- 'whatsapp', 'gmail', 'notion', 'instagram', 'linkedin', 'terminal', 'google_calendar'
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error', 'running'
  config JSONB DEFAULT '{}',                   -- API keys, tokens, settings per agent
  permissions JSONB DEFAULT '{"read": true, "write": false, "delete": false}',
  schedule JSONB DEFAULT '{}',                 -- cron or interval configs for 24/7 agents
  last_heartbeat TIMESTAMPTZ,                  -- last time agent reported alive
  last_error TEXT,
  stats JSONB DEFAULT '{"actions_today": 0, "actions_total": 0, "uptime_hours": 0}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Agent execution log
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,          -- 'send_message', 'read_email', 'sync', 'error', etc.
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'error', 'pending'
  input JSONB,
  output JSONB,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unified inbox messages from all channels
CREATE TABLE IF NOT EXISTS inbox_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL,          -- 'whatsapp', 'gmail', 'instagram', 'linkedin'
  thread_id TEXT,                 -- group conversation threads
  contact_name TEXT,
  contact_id TEXT,                -- external ID from the platform
  contact_avatar TEXT,
  direction TEXT NOT NULL DEFAULT 'inbound', -- 'inbound', 'outbound'
  content TEXT,
  content_type TEXT DEFAULT 'text', -- 'text', 'image', 'file', 'audio', 'email'
  metadata JSONB DEFAULT '{}',    -- subject, attachments, labels, etc.
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  pipeline_stage TEXT,            -- 'new', 'replied', 'follow_up', 'closed'
  tags TEXT[] DEFAULT '{}',
  external_id TEXT,               -- ID from the source platform
  external_timestamp TIMESTAMPTZ, -- when it was sent on the source platform
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inbox contact/thread aggregation
CREATE TABLE IF NOT EXISTS inbox_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL,
  contact_name TEXT,
  contact_id TEXT,
  contact_avatar TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  pipeline_stage TEXT DEFAULT 'new',
  is_pinned BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel, contact_id)
);

-- RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own agents" ON agents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own agent logs" ON agent_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own inbox" ON inbox_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own threads" ON inbox_threads FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_user_channel ON inbox_messages(user_id, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_thread ON inbox_messages(user_id, thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_user ON inbox_threads(user_id, last_message_at DESC);
