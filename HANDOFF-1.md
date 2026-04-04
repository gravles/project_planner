# 🏠 Home Projects — Claude Code Handoff Package

## Overview
A production-grade home improvement project tracker for a single owner managing three properties in Ottawa. Personal tool, not a SaaS product. Should feel like a bespoke tool built for one person — opinionated, fast, and genuinely useful on a job site.

**Owner:** Nathan  
**Properties:** 90 King George St (main house), Coach House (Airbnb carriage house, same lot), 328 Olmstead St (rental, managed but not owned)

---

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | React (Vite) |
| Styling | Tailwind CSS v3 |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email/password, single user) |
| Storage | Supabase Storage (photos, receipts) |
| Hosting | Vercel |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| State | React Query (server state) + Zustand (UI state) |

---

## Project Structure

```
/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.jsx         # Sidebar + topbar wrapper
│   │   │   ├── Sidebar.jsx
│   │   │   └── Topbar.jsx
│   │   ├── projects/
│   │   │   ├── BoardView.jsx
│   │   │   ├── ListView.jsx
│   │   │   ├── ProjectCard.jsx
│   │   │   ├── ProjectDetail.jsx    # Slide-in panel
│   │   │   ├── ProjectForm.jsx      # Create/edit modal
│   │   │   └── AIAddModal.jsx
│   │   ├── dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── KPIRow.jsx
│   │   │   ├── BudgetByProperty.jsx
│   │   │   ├── StatusBreakdown.jsx
│   │   │   ├── ActivityFeed.jsx
│   │   │   └── SpendTimeline.jsx
│   │   ├── spend/
│   │   │   ├── SpendLog.jsx
│   │   │   └── ReceiptUpload.jsx
│   │   ├── subtasks/
│   │   │   └── SubtaskList.jsx
│   │   ├── photos/
│   │   │   └── PhotoGallery.jsx
│   │   └── ui/
│   │       ├── Badge.jsx
│   │       ├── Button.jsx
│   │       ├── Modal.jsx
│   │       ├── StatusBadge.jsx
│   │       ├── PropertyBadge.jsx
│   │       ├── ProgressBar.jsx
│   │       └── EmptyState.jsx
│   ├── hooks/
│   │   ├── useProjects.js
│   │   ├── useSubtasks.js
│   │   ├── useSpend.js
│   │   ├── usePhotos.js
│   │   ├── useActivity.js
│   │   └── useAI.js
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── anthropic.js
│   │   └── utils.js
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Projects.jsx
│   │   └── Dashboard.jsx
│   ├── stores/
│   │   └── uiStore.js              # Zustand: filters, panel open state, view mode
│   └── main.jsx
├── supabase/
│   └── migrations/
│       └── 001_initial.sql
├── .env.example
├── vercel.json
└── vite.config.js
```

---

## Supabase Schema

Run this entire migration in the Supabase SQL editor.

```sql
-- ============================================================
-- 001_initial.sql
-- ============================================================

-- Properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  icon TEXT DEFAULT '🏠',
  color TEXT DEFAULT '#818cf8',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed properties
INSERT INTO properties (name, address, icon, color, sort_order) VALUES
  ('King George',  '90 King George St, Ottawa', '🏠', '#818cf8', 1),
  ('Coach House',  '90 King George St (Coach House)', '🏡', '#34d399', 2),
  ('Olmstead',     '328 Olmstead St, Ottawa', '🏗️', '#fb923c', 3);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  room TEXT NOT NULL DEFAULT 'Other',
  status TEXT NOT NULL DEFAULT 'Backlog' CHECK (status IN ('Backlog','In Progress','Blocked','Done')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Urgent')),
  due_date DATE,
  estimate_cad NUMERIC(10,2) DEFAULT 0,
  vendor TEXT,
  notes TEXT,
  position INTEGER DEFAULT 0,   -- for drag-and-drop ordering within a column
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subtasks
CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spend log entries
CREATE TABLE spend_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  amount_cad NUMERIC(10,2) NOT NULL,
  note TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,    -- Supabase Storage URL
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos (before/after, progress shots)
CREATE TABLE project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  photo_type TEXT DEFAULT 'progress' CHECK (photo_type IN ('before','progress','after')),
  taken_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log (auto-populated via triggers + manual entries)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  action TEXT NOT NULL,     -- 'status_changed', 'spend_added', 'subtask_completed', 'note_updated', 'photo_added'
  detail JSONB,             -- e.g. { "from": "Backlog", "to": "In Progress" }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags (flexible labelling)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6b7280'
);

CREATE TABLE project_tags (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

-- Seed some useful tags
INSERT INTO tags (name, color) VALUES
  ('DIY', '#60a5fa'),
  ('Permit Required', '#f59e0b'),
  ('Contractor', '#a78bfa'),
  ('Urgent', '#ef4444'),
  ('Seasonal', '#34d399'),
  ('Airbnb', '#fb923c');

-- ── Triggers ──────────────────────────────────────────────────

-- updated_at auto-update
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Activity log trigger: status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_log (project_id, action, detail)
    VALUES (NEW.id, 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_status_log
  AFTER UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- Activity log trigger: spend entries
CREATE OR REPLACE FUNCTION log_spend_added()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (project_id, action, detail)
  VALUES (NEW.project_id, 'spend_added', jsonb_build_object('amount', NEW.amount_cad, 'note', NEW.note));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spend_log_activity
  AFTER INSERT ON spend_entries
  FOR EACH ROW EXECUTE FUNCTION log_spend_added();

-- ── Row Level Security ─────────────────────────────────────────
-- Single-user app: all authenticated users can read/write everything.
-- Adjust if you ever add a second user.

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON properties FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON projects FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON subtasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON spend_entries FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON project_photos FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON activity_log FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON tags FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON project_tags FOR ALL TO authenticated USING (true);

-- ── Storage bucket ─────────────────────────────────────────────
-- Create manually in Supabase dashboard: Storage > New bucket
-- Name: "project-files"   Private: true
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);

CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-files');
CREATE POLICY "Authenticated read"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'project-files');
CREATE POLICY "Authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-files');
```

---

## Environment Variables

### `.env` (create this file in project root, do NOT commit to git)
```
VITE_SUPABASE_URL=https://jcsermnzozpqqzmkjjvx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjc2VybW56b3pwcXF6bWtqanZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzE2ODEsImV4cCI6MjA5MDg0NzY4MX0.mM_N-1DU3EutEFjTOBdyVHwtWVQseOXb4EjsHgUxBEY
VITE_ANTHROPIC_API_KEY=# Nathan will provide this key — add it before running the app
```

### `.env.example` (safe to commit — no real values)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ANTHROPIC_API_KEY=your-anthropic-key
```

### `.gitignore` — make sure this line is present
```
.env
```

> ⚠️ The Anthropic API key will be exposed client-side in this build. For a personal tool this is acceptable. If you want to harden it later, proxy AI calls through a Supabase Edge Function.

## GitHub Repository

```
https://github.com/gravles/project_planner
```

Claude Code should initialize the project here. After scaffolding:
```bash
git init
git remote add origin https://github.com/gravles/project_planner.git
git add .
git commit -m "Initial scaffold"
git push -u origin main
```

Connect this repo to Vercel for automatic deploys on push to `main`. Add the three env vars in Vercel dashboard under Project Settings → Environment Variables.

---

## Feature Specification

### 1. Auth
- Supabase email/password auth
- Single user — no registration flow, just login
- Persist session, redirect to `/login` if unauthenticated
- Clean, minimal login page — not a marketing page

### 2. Projects (Core)

**Fields:**
- Title, property, room/category, status, priority
- Due date with overdue detection
- Budget estimate (CAD)
- Vendor/contractor (free text)
- Notes (markdown rendered)
- Tags (multi-select from tag library)
- Position (integer for manual ordering within board columns)

**Views:**
- **Board** — kanban by status, 4 columns, cards draggable within and between columns (use `@dnd-kit/core`)
- **List** — sortable table with all key fields, inline status cycling
- **Dashboard** — see section 7

**Filters (persistent in URL params):**
- Property
- Status
- Priority
- Room
- Tag
- Search (title + notes full-text)
- Show/hide completed

**Sorting (list view):** due date, priority, created date, estimate, title

### 3. Subtasks
- Ordered checklist per project
- Drag to reorder (dnd-kit)
- Progress bar on cards (X/Y done)
- Bulk complete all / reset all
- Subtask completion logs to activity feed

### 4. Spend Log
- Multiple entries per project: amount, date, note, optional receipt photo
- Running total vs estimate with over-budget warning (red)
- Progress bar: % of budget consumed
- Receipt upload → stored in Supabase Storage → thumbnail in spend row
- Export spend log for a project as CSV

### 5. Photo Gallery
- Upload photos per project: before / progress / after
- Type tagging (before/progress/after) with visual grouping
- Lightbox viewer
- Stored in Supabase Storage at `project-files/{project_id}/photos/`
- Receipts stored at `project-files/{project_id}/receipts/`

### 6. Activity Feed
- Auto-logged: status changes, spend entries, subtask completions, photo uploads
- Manual note entries (add a comment/note to the timeline)
- Shown in project detail panel, newest first
- Also surfaced on dashboard as global recent activity

### 7. Dashboard
- **KPI row:** Total projects, In Progress, Blocked, Overdue, Total budgeted, Total spent, Remaining budget
- **Spend by property** — horizontal bar chart (Recharts), estimate vs actual
- **Status breakdown** — donut or bar chart
- **Budget health** — projects sorted by % over/under budget, flag anything >90% consumed
- **Overdue projects** — red alert list
- **Upcoming due dates** — next 30 days, sorted
- **Recent activity** — last 10 events across all projects
- **Spend over time** — line chart of cumulative spend by month (Recharts)

### 8. AI Features

#### Quick-Add (natural language → project)
- User describes project in plain text
- Claude extracts: title, property, room, status, priority, due date, estimate, vendor, notes, subtasks
- User reviews parsed result before saving
- System prompt should be tight and return strict JSON

#### Smart Suggestions (on project open)
- When a project detail panel opens, optionally call Claude with project context
- Returns 2-3 actionable next steps based on current status, subtasks, notes
- Shown as a subtle "AI suggestions" section, dismissible
- Cache result — don't re-fetch on every open, only when project is updated

#### Budget Estimator
- User describes scope of work in a text field
- Claude returns a rough CAD estimate with breakdown
- Pre-fills the estimate field

#### Weekly Summary (manual trigger)
- Button on dashboard: "Generate Weekly Summary"
- Sends all project data to Claude
- Returns a plain-English summary: what's in progress, what's overdue, what was completed recently, total spend this month
- Displayed in a modal, copyable

### 9. Tags
- Create/manage tags with name + colour
- Apply multiple tags to a project
- Filter board/list by tag
- Tag chips shown on cards

### 10. Properties
- Properties are editable (name, address, icon, colour)
- Property filter in topbar applies globally across all views
- Property summary cards on dashboard

### 11. Export
- Export all projects (filtered or all) as CSV
- Export single project spend log as CSV
- Print-friendly project detail view (CSS `@media print`)

### 12. Keyboard Shortcuts
- `N` — new project
- `A` — AI quick-add
- `B` / `L` / `D` — switch to board / list / dashboard
- `Escape` — close panel/modal
- `F` — focus search
- Show shortcuts with `?`

### 13. PWA (Progressive Web App)
- Add `manifest.json` and service worker via Vite PWA plugin (`vite-plugin-pwa`)
- "Add to Home Screen" on mobile
- Basic offline support: cache the app shell, show cached data when offline
- This makes it usable on a job site without great cell signal

---

## Design Direction

**Aesthetic:** Industrial utility. Dark background (#0d1117 base), warm amber accent (#f59e0b), tight typography, high information density without feeling cluttered. Feels like a tool built for a contractor who also has good taste.

**Typography:**
- Display / headings: `Syne` (Google Fonts) — geometric, confident
- Body: `DM Sans` — clean, readable at small sizes

**Color palette:**
```css
--bg-base:      #0d1117;
--bg-surface:   #111827;
--bg-elevated:  #1a2030;
--border:       #1f2937;
--border-hover: #374151;
--text-primary: #f9fafb;
--text-secondary: #9ca3af;
--text-muted:   #4b5563;
--accent:       #f59e0b;   /* amber — primary CTA, active states */
--success:      #22c55e;
--danger:       #ef4444;
--info:         #60a5fa;

/* Property colours */
--king-george:  #818cf8;   /* indigo */
--coach-house:  #34d399;   /* emerald */
--olmstead:     #fb923c;   /* orange */
```

**Motion:**
- Panel slide-in: 250ms ease-out from right
- Card hover: subtle border brighten, no movement
- Status badge cycle: brief scale pulse
- Page transitions: fade (150ms)
- Use Framer Motion for panel and modal animations

**Cards:**
- Show: property colour strip (left border), priority indicator, title, due date if set, subtask progress bar, budget bar, status badge
- Compact enough to see 4-5 per column without scrolling

---

## Key Libraries

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "@tanstack/react-query": "^5",
    "@dnd-kit/core": "^6",
    "@dnd-kit/sortable": "^8",
    "framer-motion": "^11",
    "recharts": "^2",
    "zustand": "^4",
    "react-router-dom": "^6",
    "react-markdown": "^9",
    "react-hotkeys-hook": "^4",
    "date-fns": "^3",
    "vite-plugin-pwa": "^0.19"
  }
}
```

---

## Data Fetching Pattern

Use React Query throughout. Example pattern:

```js
// hooks/useProjects.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useProjects(filters = {}) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      let q = supabase
        .from('projects')
        .select(`
          *,
          property:properties(*),
          subtasks(*),
          spend_entries(*),
          project_photos(*),
          project_tags(tag:tags(*))
        `)
        .order('position')

      if (filters.property_id) q = q.eq('property_id', filters.property_id)
      if (filters.status) q = q.eq('status', filters.status)
      if (filters.search) q = q.ilike('title', `%${filters.search}%`)

      const { data, error } = await q
      if (error) throw error
      return data
    }
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] })
  })
}
```

---

## AI Integration

```js
// lib/anthropic.js
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

export async function parseProjectFromText(text) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are a home project parser. Extract structured project data from the user's description.
Return ONLY a valid JSON object with these exact fields:
{
  "title": string,
  "property": "King George" | "Coach House" | "Olmstead" | "Other",
  "room": "Exterior" | "Kitchen" | "Living Room" | "Bedroom" | "Bathroom" | "Basement" | "Electrical" | "Permits & Legal" | "Other",
  "status": "Backlog" | "In Progress" | "Blocked" | "Done",
  "priority": "Low" | "Medium" | "High" | "Urgent",
  "due_date": "YYYY-MM-DD or null",
  "estimate_cad": number,
  "vendor": string,
  "notes": string,
  "subtasks": [{ "text": string }]
}
No markdown. No explanation. JSON only.`,
      messages: [{ role: 'user', content: text }]
    })
  })
  const data = await res.json()
  const raw = data.content?.find(b => b.type === 'text')?.text || '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function getProjectSuggestions(project) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are a practical home renovation assistant. Given a project's details, suggest 2-3 specific, actionable next steps. Be concrete and practical. Return ONLY a JSON array of strings. No markdown.`,
      messages: [{ role: 'user', content: JSON.stringify({
        title: project.title,
        status: project.status,
        notes: project.notes,
        subtasks: project.subtasks,
        vendor: project.vendor,
      })}]
    })
  })
  const data = await res.json()
  const raw = data.content?.find(b => b.type === 'text')?.text || '[]'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function estimateBudget(description) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: `You are a Canadian home renovation cost estimator (Ottawa market, CAD prices). Given a description of work, return a JSON object:
{
  "total_cad": number,
  "breakdown": [{ "item": string, "amount_cad": number }],
  "notes": string
}
Be realistic. Include labour if contractor work. JSON only.`,
      messages: [{ role: 'user', content: description }]
    })
  })
  const data = await res.json()
  const raw = data.content?.find(b => b.type === 'text')?.text || '{}'
  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}

export async function generateWeeklySummary(projects) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `You are a home project assistant writing a weekly summary for the homeowner. Be direct and practical. Structure: what's in progress, what's overdue and needs attention, what was recently completed, current budget status. Use plain English, not bullet points. Keep it under 200 words.`,
      messages: [{ role: 'user', content: JSON.stringify(projects) }]
    })
  })
  const data = await res.json()
  return data.content?.find(b => b.type === 'text')?.text || ''
}
```

---

## Vercel Configuration

```json
// vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Setup Instructions for Claude Code

Run these steps in order:

```bash
# 1. Create Vite + React project
npm create vite@latest home-projects -- --template react
cd home-projects

# 2. Install all dependencies
npm install @supabase/supabase-js @tanstack/react-query @dnd-kit/core @dnd-kit/sortable framer-motion recharts zustand react-router-dom react-markdown react-hotkeys-hook date-fns

npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
npx tailwindcss init -p

# 3. Configure Tailwind (tailwind.config.js)
# content: ["./index.html", "./src/**/*.{js,jsx}"]
# Extend theme with custom colors from design spec

# 4. Set up .env from .env.example

# 5. Run Supabase migration (paste 001_initial.sql into Supabase SQL editor)

# 6. Build in this order:
#    a. lib/supabase.js + lib/anthropic.js
#    b. Auth (Login page + ProtectedRoute)
#    c. AppShell layout (sidebar, topbar)
#    d. useProjects hook + Projects page (board view first)
#    e. ProjectCard + ProjectDetail panel
#    f. ProjectForm (create/edit)
#    g. Subtasks, SpendLog, PhotoGallery (add to detail panel)
#    h. ListView
#    i. Dashboard + charts
#    j. AI features (AIAddModal, suggestions, budget estimator, weekly summary)
#    k. Tags system
#    l. Drag-and-drop (dnd-kit)
#    m. Keyboard shortcuts
#    n. PWA config
#    o. Export (CSV)
#    p. Polish: animations, empty states, error boundaries, loading skeletons
```

---

## Prototype Reference

A working React prototype (no backend) was built and validated before this spec. It includes:
- Board + list views
- Status cycling, filtering, search
- Subtasks with progress bars
- Spend log with multiple entries
- AI quick-add via Anthropic API
- Dashboard with charts
- Multi-property support (King George, Coach House, Olmstead)

The prototype's component structure, color system, and interaction patterns should be used as the UX reference. Improve on it — don't just copy it.

---

## Seed Data

Pre-populate these projects after schema setup for immediate usefulness:

| Title | Property | Status | Priority | Estimate |
|-------|----------|--------|----------|----------|
| TV Lift Cabinet – Palladian Arch Niche | King George | In Progress | High | $800 |
| STR Permit Appeal – Carriage House | Coach House | In Progress | Urgent | $1,500 |
| Fourplex Conversion | Olmstead | Backlog | High | $45,000 |
| Leather Corner Sectional | King George | Backlog | Medium | $4,000 |
| Dining Table + Chairs (Article Seno) | King George | Backlog | Medium | $2,200 |

---

## Quality Bar

This is a personal tool, not a side project with cut corners. Claude Code should:

- Handle loading and error states everywhere (skeleton loaders, not spinners)
- Write clean, typed-style prop validation
- Never let the UI break on empty states (empty boards, no projects, no spend)
- Make the mobile/tablet experience usable (responsive layout, sidebar collapses)
- Use React Query's optimistic updates for status cycling and subtask toggling so the UI feels instant
- Add proper `<title>` tags and favicon
- Ensure Supabase errors surface as user-friendly toasts, not console logs

---

*Generated by Claude · April 2026*
