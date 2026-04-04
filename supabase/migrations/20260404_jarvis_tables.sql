-- OpenJarvis tables for KIRA (no external tracking)

create table if not exists jarvis_telemetry (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  model_id text not null,
  engine text not null default '',
  agent text not null default '',
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  latency_seconds double precision not null default 0.0,
  ttft double precision not null default 0.0,
  cost_usd double precision not null default 0.0,
  energy_joules double precision not null default 0.0,
  tokens_per_sec double precision not null default 0.0,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists jarvis_savings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  total_calls integer not null default 0,
  total_tokens integer not null default 0,
  local_cost double precision not null default 0.0,
  token_counting_version integer not null default 2
);

create table if not exists jarvis_savings_per_provider (
  id bigint generated always as identity primary key,
  savings_id bigint references jarvis_savings(id) on delete cascade,
  provider text not null,
  label text not null default '',
  input_cost double precision not null default 0.0,
  output_cost double precision not null default 0.0,
  total_cost double precision not null default 0.0,
  energy_wh double precision not null default 0.0,
  flops double precision not null default 0.0
);

create table if not exists jarvis_conversations (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  model text not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jarvis_messages (
  id bigint generated always as identity primary key,
  conversation_id text not null references jarvis_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  tool_calls jsonb,
  usage jsonb,
  telemetry jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_jarvis_telemetry_user on jarvis_telemetry (user_id, created_at desc);
create index if not exists idx_jarvis_savings_user on jarvis_savings (user_id, created_at desc);
create index if not exists idx_jarvis_conv_user on jarvis_conversations (user_id, updated_at desc);
create index if not exists idx_jarvis_msg_conv on jarvis_messages (conversation_id, created_at);

-- RLS
alter table jarvis_telemetry enable row level security;
alter table jarvis_savings enable row level security;
alter table jarvis_savings_per_provider enable row level security;
alter table jarvis_conversations enable row level security;
alter table jarvis_messages enable row level security;

create policy "users_own_data" on jarvis_telemetry for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users_own_data" on jarvis_savings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users_own_data" on jarvis_savings_per_provider for all using (
  exists (select 1 from jarvis_savings s where s.id = savings_id and s.user_id = auth.uid())
);
create policy "users_own_data" on jarvis_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users_own_data" on jarvis_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
