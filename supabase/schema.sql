-- KIRA — Operating Intelligence
-- Database Schema v1.0

-- PROFILES — extensión del usuario
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT,
  avatar_url    TEXT,
  daily_goal_hours    DECIMAL DEFAULT 8,
  weekly_goal_hours   DECIMAL DEFAULT 40,
  work_days     INT[] DEFAULT '{1,2,3,4,5}',
  theme         TEXT DEFAULT 'dark',
  default_view  TEXT DEFAULT 'list',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- CATEGORIES
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- PROJECTS
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  category_id   UUID REFERENCES categories(id),
  is_archived   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- MEETINGS (created before tasks to allow FK reference)
CREATE TABLE meetings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  scheduled_at      TIMESTAMPTZ,
  duration_mins     INT,
  participants      TEXT,
  status            TEXT CHECK (status IN (
                      'scheduled','in_progress','completed','cancelled'
                    )) DEFAULT 'scheduled',
  pre_notes         TEXT,
  post_notes        TEXT,
  transcript        TEXT,
  ai_summary        TEXT,
  calendar_event_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- TASKS
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  category_id     UUID REFERENCES categories(id),
  project_id      UUID REFERENCES projects(id),
  priority        TEXT CHECK (priority IN ('q1','q2','q3','q4')),
  status          TEXT CHECK (status IN (
                    'backlog','todo','in_progress',
                    'waiting','done','deleted'
                  )) DEFAULT 'backlog',
  estimated_mins  INT,
  due_date        DATE,
  tags            TEXT[] DEFAULT '{}',
  kira_score      INT CHECK (kira_score BETWEEN 0 AND 100),
  notes           TEXT,
  difficulty      TEXT CHECK (difficulty IN ('easier','as_expected','harder')),
  post_notes      TEXT,
  meeting_id      UUID REFERENCES meetings(id),
  parent_task_id  UUID REFERENCES tasks(id),
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- TIMER SESSIONS
CREATE TABLE timer_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL,
  ended_at    TIMESTAMPTZ,
  paused_at   TIMESTAMPTZ,
  total_paused_secs INT DEFAULT 0,
  net_secs    INT,
  status      TEXT CHECK (status IN ('running','paused','completed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- TAGS
CREATE TABLE tags (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  UNIQUE(user_id, name)
);

-- ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users see own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own timer_sessions" ON timer_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own meetings" ON meetings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own categories" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own tags" ON tags FOR ALL USING (auth.uid() = user_id);

-- INDEXES
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_project ON tasks(user_id, project_id);
CREATE INDEX idx_tasks_user_category ON tasks(user_id, category_id);
CREATE INDEX idx_timer_sessions_task ON timer_sessions(task_id);
CREATE INDEX idx_timer_sessions_user ON timer_sessions(user_id, started_at);

-- TRIGGER: Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');

  -- Seed default categories
  INSERT INTO public.categories (user_id, name, is_default) VALUES
    (new.id, 'Development', true),
    (new.id, 'Security', true),
    (new.id, 'Growth', true),
    (new.id, 'Admin', true),
    (new.id, 'Personal', true);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
