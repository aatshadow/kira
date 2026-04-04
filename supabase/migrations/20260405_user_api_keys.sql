-- =============================================
-- KIRA — User API Keys (encrypted storage)
-- =============================================

create table if not exists user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  service text not null, -- 'brave_search' | 'e2b' | 'anthropic' | 'google' | etc.
  api_key text not null,
  metadata jsonb default '{}', -- extra config per service
  is_valid boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, service)
);

alter table user_api_keys enable row level security;

create policy "Users manage own API keys"
  on user_api_keys for all
  using (auth.uid() = user_id);

create index idx_user_api_keys_user on user_api_keys(user_id);
