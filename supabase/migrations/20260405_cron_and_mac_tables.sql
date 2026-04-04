-- =============================================
-- KIRA — Cron, Notifications, Mac Daemon tables
-- =============================================

-- Daily/weekly/monthly AI digests
create table if not exists kira_digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('daily', 'weekly', 'monthly')),
  content jsonb not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz default now()
);

alter table kira_digests enable row level security;
create policy "Users see own digests" on kira_digests for all using (auth.uid() = user_id);
create index idx_kira_digests_user on kira_digests(user_id, created_at desc);

-- Notification queue
create table if not exists kira_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('digest', 'email_urgent', 'calendar_reminder', 'agent_complete', 'mac_task_done')),
  title text not null,
  body text,
  data jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

alter table kira_notifications enable row level security;
create policy "Users see own notifications" on kira_notifications for all using (auth.uid() = user_id);
create index idx_kira_notifications_user on kira_notifications(user_id, read, created_at desc);

-- Mac daemon sessions (heartbeat tracking)
create table if not exists kira_mac_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  mac_id text not null,
  last_heartbeat timestamptz not null default now(),
  capabilities jsonb default '{}',
  load jsonb default '{}',
  created_at timestamptz default now()
);

alter table kira_mac_sessions enable row level security;
create policy "Users see own mac sessions" on kira_mac_sessions for all using (auth.uid() = user_id);
create unique index idx_kira_mac_sessions_unique on kira_mac_sessions(user_id, mac_id);

-- Task queue (Mac delegation)
create table if not exists kira_task_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('shell', 'scrape', 'jarvis_agent', 'code_exec')),
  payload jsonb not null default '{}',
  status text default 'pending' check (status in ('pending', 'assigned', 'running', 'completed', 'failed')),
  target text default 'auto' check (target in ('vercel', 'mac', 'auto')),
  result jsonb,
  error text,
  assigned_to text,
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);

alter table kira_task_queue enable row level security;
create policy "Users see own task queue" on kira_task_queue for all using (auth.uid() = user_id);
create index idx_kira_task_queue_pending on kira_task_queue(user_id, status) where status in ('pending', 'assigned', 'running');
