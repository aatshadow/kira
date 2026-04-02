# KIRA — API Setup Guide

## APIs Overview

| API | Purpose | Variables | Status |
|-----|---------|-----------|--------|
| **Supabase** | Database, auth, real-time | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Already configured |
| **Anthropic (Claude)** | KIRA AI chat, summaries, profiles, task extraction, meeting digests | `ANTHROPIC_API_KEY` | Already configured |
| **Google OAuth** | Calendar sync, Meet transcripts, Drive access | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Needs setup |

---

## Google OAuth Setup (Calendar + Drive)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** > **New Project**
3. Name: `KIRA` (or whatever you prefer)
4. Click **Create**

### Step 2: Enable APIs

1. Go to **APIs & Services** > **Library**
2. Search and enable:
   - **Google Calendar API**
   - **Google Drive API**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. User Type: **External** (or Internal if using Workspace)
3. Fill in:
   - App name: `KIRA`
   - User support email: your email
   - Developer contact: your email
4. **Scopes**: Add these:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`
5. **Test users**: Add your Google account email
6. Save

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ Create Credentials** > **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: `KIRA Web`
5. **Authorized redirect URIs**:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-production-url.com/auth/callback` (production)
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### Step 5: Configure .env.local

Add to your `.env.local`:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

### Step 6: Configure Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your KIRA project
3. Go to **Authentication** > **Providers** > **Google**
4. Enable it
5. Paste the same **Client ID** and **Client Secret**
6. Save

### Step 7: Run Database Migration

In the Supabase SQL Editor, run:

```sql
-- File: supabase/migrations/20260402_google_integration.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_calendar_sync TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS google_meet_url TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'kira';
ALTER TABLE meetings ADD CONSTRAINT meetings_source_check CHECK (source IN ('kira', 'google_calendar'));
CREATE INDEX IF NOT EXISTS idx_meetings_calendar_event ON meetings(calendar_event_id);
```

### Step 8: Test

1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Click **Continuar con Google**
4. Grant calendar + drive permissions
5. Go to **Settings** > **Integraciones** — should show Google Calendar as "Conectado"
6. Go to **Management** > **Meetings** — Google Calendar events should appear

---

## What Each Integration Does

### Google Calendar Sync (`/api/calendar/sync`)
- Imports events from the last 7 days to 14 days ahead
- Past events = completed, future = scheduled
- Runs automatically every 5 minutes + on dashboard load
- Deduplicates using `calendar_event_id`
- Code: `src/app/api/calendar/sync/route.ts`

### Google Meet Transcripts (`/api/calendar/transcripts`)
- Searches Google Drive for meeting transcript documents
- Matches by meeting title + date
- Saves transcript text to the meeting record
- Code: `src/app/api/calendar/transcripts/route.ts`

### AI Meeting Digest (`/api/ai/meeting-digest`)
- Reads a meeting's transcript
- Generates executive summary with Claude
- Extracts action items as tasks (linked via `meeting_id`)
- Code: `src/app/api/ai/meeting-digest/route.ts`

### Integration Status (`/api/integrations/status`)
- Returns connection status for all integrations
- Used by Settings > Integraciones UI
- Code: `src/app/api/integrations/status/route.ts`

---

## KIRA AI Chat Actions

The AI chat (`/api/ai/chat`) can execute these actions:

| Action | Description |
|--------|-------------|
| `create_task` | Create a new task |
| `edit_task` | Edit an existing task |
| `delete_task` | Delete (soft) a task |
| `create_meeting` | Create a new meeting |
| `edit_meeting` | Edit a meeting |
| `delete_meeting` | Cancel a meeting |
| `save_memory` | Save something to KIRA's memory |
| `delete_memory` | Delete a memory |
| `create_calendar_event` | Create Google Calendar event |
| `update_calendar_event` | Update Google Calendar event |
| `delete_calendar_event` | Delete Google Calendar event |
| `create_category` | Create a task category |
| `create_project` | Create a project |
| `sync_calendar` | Force Google Calendar sync |
| `digest_meeting` | Generate AI summary + tasks from transcript |

---

## Future Integrations (Coming Soon)

| Integration | What it will do | API needed |
|-------------|-----------------|------------|
| **WhatsApp** | Messages, conversation tracking | WhatsApp Business API or MCP |
| **Notion** | Sync databases, notes | Notion API (`NOTION_API_KEY`) |
| **Gmail** | Email management, task extraction | Gmail API (same Google OAuth + scope) |
