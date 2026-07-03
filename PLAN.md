# Project Planner — Improvement & Feature Plan

> **STATUS (2026-07-03): all phases implemented, merged to `main`, and deployed**
> (commits `920bd4a` → `ad994e0`). All database migrations (007–014, including the
> deferred `008_private_bucket.sql`) are applied to the live Supabase project; the
> storage bucket is private and production endpoints verified failing closed.
> Remaining manual steps:
> 1. Supabase Dashboard → Authentication → disable "Allow new users to sign up" (0.1).
> 2. Vercel env vars: add `MCP_AUTHORIZE_PASSWORD`, `CRON_SECRET`, `RESEND_API_KEY`,
>    `DIGEST_TO_EMAIL` (and optionally `EMAIL_FROM` for a verified Resend domain).
> Implementation deviations from the plan are noted in the commit messages (e.g. migration
> numbering shifted by one: 011 = notification_log, 012 = documents).

**Audience:** an implementing AI agent (or developer) working phase by phase.
**Scope decision (July 2026):** this remains a **personal tool for one user (Nathan)**. Do NOT build
multi-tenancy, organizations, RBAC, SSO, or billing. The goals are: (1) close the security holes that
are exploitable today, (2) raise day-to-day polish, (3) add standout features that make the app
genuinely better than off-the-shelf tools for managing three properties in Ottawa
(King George — main house, Coach House — Airbnb, Olmstead — rental).

---

## How to work this plan

- Work phases **in order**. Within a phase, each numbered task should be **one PR** unless marked otherwise.
- **Migrations ship before the code that depends on them.** Apply SQL to Supabase first, then merge the app code.
- Before opening any PR: `npm run lint && npm run test:run` must pass.
- Match existing code style: plain JSX (no TypeScript migration in this plan), Tailwind tokens from
  `tailwind.config.js`, React Query for server state, Zustand for UI state, toasts via `src/stores/toastStore.js`.
- Add unit tests for any new pure logic in `src/lib/` (see `src/test/projectFilters.test.js` for the pattern).
- Never commit `.env`. New server-side env vars go in `.env.example` (placeholder values only) and must be
  added in the Vercel dashboard before the code that reads them deploys.
- Keep components under ~300 lines; extract sections rather than growing `ProjectDetail.jsx` further.

### Environment variables (current + added by this plan)

| Var | Where | Status |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | client | exists |
| `ANTHROPIC_API_KEY` | Vercel serverless | exists |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Vercel serverless | exists |
| `OAUTH_JWT_SECRET`, `MCP_SECRET` | Vercel serverless | exists |
| `MCP_AUTHORIZE_PASSWORD` | Vercel serverless | **new — Phase 0.3** |
| `CRON_SECRET` | Vercel serverless | **new — Phase 3** |
| `RESEND_API_KEY`, `DIGEST_TO_EMAIL` | Vercel serverless | **new — Phase 4** |

### Deployment flow (every phase)

1. Branch from `main` → PR → CI (Phase 1.2 adds it) → Vercel preview deploy.
2. If the PR needs a migration: apply the migration to Supabase **first** (via Supabase CLI once Phase 1.1
   lands; via SQL editor before that), confirm the preview deploy works against it, then merge.
3. Merge → Vercel auto-deploys production. Verify with the smoke checklist below.
4. Rollback strategy: Vercel "instant rollback" for code; migrations must be **additive only**
   (new tables/columns/policies — never drop or rename in the same release as the code change).

**Post-deploy smoke checklist:** log in → board loads → open a project → toggle a subtask → add a spend
entry → upload a photo → AI quick-add parses → share link renders logged-out.

---

## Phase 0 — Security hardening (do first; the app is exploitable today)

### 0.1 Close open registration
- **Manual step for Nathan:** Supabase Dashboard → Authentication → Sign In / Up → disable "Allow new users
  to sign up". (Removing the UI is not enough — `supabase.auth.signUp` works via the anon key directly.)
- Code: delete `src/pages/Register.jsx`, remove the `/register` route from `src/main.jsx`, remove the
  register link from `src/pages/Login.jsx`.
- Acceptance: POSTing a signUp via the anon key returns "Signups not allowed"; `/register` redirects to `/`.

### 0.2 Authenticate and constrain `/api/claude`
File: `api/claude.js`. Today it forwards **any** body to Anthropic with no auth — anyone who finds the URL
gets free API usage.
- Require a Supabase JWT: read `Authorization: Bearer <token>` from the request, verify with
  `createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)`; 401 if invalid.
  (Add `SUPABASE_ANON_KEY` to Vercel env — same value as `VITE_SUPABASE_ANON_KEY`.)
- Client change: in `src/lib/anthropic.js` `callClaude()`, get the session via
  `supabase.auth.getSession()` and send the access token in the `Authorization` header.
- Enforce server-side: `body.model` must equal `claude-sonnet-4-20250514` (single allowlist constant);
  `body.max_tokens` capped at 1500; reject bodies over ~200 KB (guards giant image payloads; receipt
  images are fine under this).
- Remove `Access-Control-Allow-Origin: *` — same-origin requests don't need CORS headers at all.
- Acceptance: unauthenticated POST → 401; oversized/foreign-model body → 400; all existing AI features
  still work when logged in.

### 0.3 Lock the OAuth → MCP flow
Files: `api/oauth/authorize.js`, `api/oauth/token.js`, `api/_lib/oauth.js`. Today **anyone** can register
an OAuth client, click "Authorize" (no login exists on that page), and get a token to the MCP server,
which uses the service-role key = full database read/write.
- Add a **password field** to the authorize page form; on POST, compare against
  `process.env.MCP_AUTHORIZE_PASSWORD` (constant-time compare via `crypto.timingSafeEqual` on sha256
  digests). Wrong/missing password → re-render the page with an error, do not issue a code.
- On POST, **re-validate** `client_id` exists and `redirect_uri` is registered (the GET does this; the
  POST currently doesn't — fix that).
- In `api/oauth/token.js`, verify (and add if missing): auth codes are single-use (`used_at` set and
  checked), expired codes rejected, PKCE verified. Read the file and patch any gap.
- Optional hardening: reject `/oauth/register` unless a `registration_key` query param matches
  `MCP_SECRET`. Claude's MCP connector lets you supply extra registration params; if that's awkward,
  leaving DCR open is acceptable once authorize requires the password.
- Acceptance: the full connect-from-Claude flow works when the password is entered; a scripted
  code-grant without the password fails; direct POST with bogus client_id fails.

### 0.4 Scope RLS on child tables to project access
New migration `supabase/migrations/007_rls_child_tables.sql`. Even with signups disabled this is correct
defense-in-depth, and it makes future collaborator invites safe.

```sql
-- Helper: does the current user have access to this project?
CREATE OR REPLACE FUNCTION has_project_access(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
      AND (owner_id IS NULL OR owner_id = auth.uid()
           OR id IN (SELECT project_id FROM project_collaborators WHERE user_id = auth.uid()))
  );
$$;

-- Repeat this pattern for: subtasks, spend_entries, project_photos, activity_log, project_tags
DROP POLICY IF EXISTS "Authenticated full access" ON subtasks;
CREATE POLICY "project scoped" ON subtasks FOR ALL TO authenticated
  USING (has_project_access(project_id)) WITH CHECK (has_project_access(project_id));
```
- Leave `properties`, `tags`, `room_types`, `vendors` on the existing authenticated-full policies —
  they're shared reference data for a single household.
- Backfill: `UPDATE projects SET owner_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
  WHERE owner_id IS NULL;` (one user exists; verify before running).
- Acceptance: app functions identically for Nathan; a second (manually created) test user sees no
  projects and no child rows.

### 0.5 Private storage bucket + signed URLs
Migration `008_private_bucket.sql`: `UPDATE storage.buckets SET public = false WHERE id = 'project-files';`
and `DROP POLICY IF EXISTS "Public read project-files" ON storage.objects;`
- Add `getSignedUrl(path, expiresIn = 3600)` helper to `src/lib/supabase.js` using
  `supabase.storage.from('project-files').createSignedUrl(...)`.
- Update every `getPublicUrl` call site: search the repo (`grep -rn getPublicUrl src api`) — expect
  `src/hooks/usePhotos.js`, `src/hooks/useAttachments.js`, `PhotoGallery.jsx`, `api/share.js`.
- `api/share.js` runs with the service role: replace `getPublicUrl` with `createSignedUrl` (1-hour TTL)
  — signed URLs in the JSON response are fine for a read-only share page.
- Client-side photo lists: fetch signed URLs in the React Query hook (batch via
  `createSignedUrls(paths[])`) so components keep receiving a `url` field — minimizes component changes.
- Acceptance: photos/receipts render everywhere including the share view; copying a raw storage URL into
  an incognito window returns 400/403.

### 0.6 Repo hygiene (single PR)
- Add `.vite/` to `.gitignore` and `git rm -r --cached .vite`.
- Delete `temp_favicon.svg`, `temp_nd.html`.
- Replace the default-Vite `README.md` with a real one: what the app is, stack, local setup
  (`npm i`, `.env` from `.env.example`, `npm run dev`), migration workflow, deploy notes.
- Edit `HANDOFF-1.md`: strip the real Supabase URL/anon key block (leave a note pointing to `.env.example`).
- Fix `.env.example`: it should list `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only for client, and
  document the server-side vars in the README instead.

---

## Phase 1 — Foundation & polish (makes everything after faster/safer)

### 1.1 Supabase CLI migration workflow
- `npx supabase init`, link the project, move existing SQL files into the CLI's expected structure.
- Rename the duplicate-numbered migrations (`003_shopping_list.sql` and `003_templates_vendors.sql`)
  using their true apply order with full timestamps per CLI convention. **Do not edit their contents.**
- Document in README: new migration = `npx supabase migration new <name>`; apply = `npx supabase db push`.
- Acceptance: `supabase migration list` shows local and remote in sync.

### 1.2 CI with GitHub Actions
`.github/workflows/ci.yml`: on PR and push to main — checkout, setup-node 22 with npm cache,
`npm ci`, `npm run lint`, `npm run test:run`, `npm run build` (build catches import errors; supply dummy
`VITE_SUPABASE_URL=https://example.supabase.co` and `VITE_SUPABASE_ANON_KEY=dummy` as env for the build step).
- Acceptance: a PR with a lint error fails CI.

### 1.3 Error boundary + friendlier failures
- New `src/components/ErrorBoundary.jsx` (class component with `componentDidCatch`), rendering a styled
  "Something broke — reload" card matching the dark theme. Wrap the `<Routes>` in `src/main.jsx`.
- Log the error to console with component stack (no external service at this stage).
- Acceptance: throwing inside a page renders the fallback instead of a white screen.

### 1.4 Optimistic updates for the hot paths
In `src/hooks/useProjects.js`, add React Query optimistic updates (`onMutate` → cancel queries, snapshot,
write cache; `onError` → restore snapshot; `onSettled` → invalidate) for:
- `useUpdateProject` when only `status` changes (board drag + status cycling),
- `useToggleSubtask` (update both `['project', id]` and the `['projects']` caches).
- Acceptance: toggling a subtask or dragging a card updates instantly with network throttled to Slow 3G.

### 1.5 Filters and view state that survive refresh
- Persist `viewMode`, `sidebarOpen`, `activeProperty` with `zustand/middleware` `persist`
  (key `pp-ui`, localStorage). Keep `detailProjectId` and search out of persistence.
- Sync `searchQuery` + `activeFilters` to URL search params on the Projects page (a small
  `useFilterUrlSync()` hook using `useSearchParams`: store → URL on change, URL → store on mount).
- Acceptance: refresh keeps view/filters; a URL with `?status=Blocked` opens pre-filtered; back button
  works after changing filters.

### 1.6 Keyboard shortcuts + help overlay
Using `react-hotkeys-hook` (already a dep), in `AppShell`:
`n` new project, `a` AI quick-add, `b`/`l`/`c` board/list/calendar, `d` dashboard (navigate), `f` already
exists, `Escape` closes detail panel/modals (audit each modal — several handle it, make consistent),
`?` opens a shortcuts modal (new small component listing all bindings).
Guard: ignore when focus is in an input/textarea/contenteditable (`enableOnFormTags: false`).
- Acceptance: all shortcuts work from the board; none fire while typing in search.

### 1.7 Skeleton loaders + undo for delete
- Replace the spinner in `src/pages/Projects.jsx` with a board-shaped skeleton (4 columns × 3 pulsing
  cards) and a list-row skeleton for ListView; skeleton KPI cards on Dashboard.
- Soft-delete projects: migration `009_soft_delete.sql` adds `deleted_at TIMESTAMPTZ` to `projects`;
  `useProjects`/`useProject`/MCP `list_projects` add `.is('deleted_at', null)`. `useDeleteProject`
  becomes "set deleted_at", and the success toast gains an **Undo** action (toastStore already supports
  custom content? — check; if not, add an optional `action: {label, onClick}` to toasts). Hard-delete
  is out of scope.
- Acceptance: delete → toast with Undo → clicking Undo restores the project with subtasks/spend intact.

---

## Phase 2 — Command palette & global search (standout feature #1)

A ⌘K palette that makes the whole app keyboard-drivable. New `src/components/CommandPalette.jsx`,
mounted in `AppShell`, opened with `cmd+k` / `ctrl+k`.

- **Data:** reuse the `['projects']` query cache + `useVendors` + static actions. No new backend.
- **Sections:** Actions (New project, AI quick-add, Log spend, Go to Dashboard/Reports/Vendors/Shopping,
  Toggle view), Projects (fuzzy over title + property + room), Vendors, Properties (activate filter).
- **Fuzzy match:** implement a small scorer in `src/lib/fuzzy.js` (subsequence match with
  start-of-word bonus) + unit tests. No new dependency.
- **Behavior:** arrow keys + Enter, `Esc` closes, selecting a project opens the detail panel (navigate
  to `/` first if needed), recent selections stored in localStorage and shown when query is empty.
- **Design:** centered modal, `bg-bg-surface` card, amber highlight on the active row, kbd hints.
- Acceptance: from any page, `cmd+k` → type 3 letters of a project → Enter opens it. Fully usable
  without a mouse.

---

## Phase 3 — Maintenance engine (standout feature #2)

Recurring, seasonal property upkeep that generates real projects automatically. This replaces/absorbs the
half-built `recurrence` columns on projects.

### 3.1 Schema — migration `010_maintenance.sql`
```sql
CREATE TABLE maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('monthly','quarterly','biannual','annual')),
  anchor_month INTEGER CHECK (anchor_month BETWEEN 1 AND 12), -- for annual/biannual (e.g. May gutters)
  lead_days INTEGER NOT NULL DEFAULT 14,       -- create the project this many days before due
  checklist JSONB NOT NULL DEFAULT '[]',        -- [{"text": "..."}]
  estimate_cad NUMERIC(10,2) DEFAULT 0,
  room TEXT DEFAULT 'Other',
  priority TEXT DEFAULT 'Medium',
  vendor TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_generated_due DATE,                      -- dedupe guard
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE maintenance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON maintenance_plans FOR ALL TO authenticated USING (true);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS maintenance_plan_id UUID REFERENCES maintenance_plans(id) ON DELETE SET NULL;
```

### 3.2 Generator — `api/cron/maintenance.js` + `vercel.json` cron
- `vercel.json`: add `"crons": [{ "path": "/api/cron/maintenance", "schedule": "0 11 * * *" }]` (daily, ~6am Ottawa).
- Handler: require `Authorization: Bearer ${CRON_SECRET}` (Vercel sends this automatically when
  `CRON_SECRET` is set). Logic: for each active plan compute the next due date from cadence +
  anchor_month; if `due - lead_days <= today` and `last_generated_due != due`, insert a project
  (title `"{plan.title} — {MMM yyyy}"`, due_date, subtasks from checklist, `maintenance_plan_id`) and
  update `last_generated_due`. Use the service-role client.
- Put the pure date logic in `src/lib/maintenanceSchedule.js` (exported functions, imported by the API
  route) **with thorough unit tests** — month rollover, biannual anchors, lead-day windows.

### 3.3 UI — "Maintenance" page
- New route `/maintenance` + sidebar entry (calendar-clock icon).
- **Year wheel:** 12-month horizontal strip per property; each plan renders a chip in its due month(s);
  overdue-ungeneratedchips amber, completed green (join against generated projects' statuses).
- Plan CRUD modal: title, property, cadence, anchor month, lead days, checklist editor, estimate, vendor.
- **AI seeding button** — "Suggest a plan for this property": calls a new `suggestMaintenancePlan(property)`
  in `src/lib/anthropic.js` (prompt: Ottawa climate, property type, return JSON array of
  {title, cadence, anchor_month, checklist, estimate_cad}); user reviews/checks rows before bulk insert.
- Generated projects show a small "recurring" badge on cards (presence of `maintenance_plan_id`).
- Acceptance: create "Furnace filter, quarterly, lead 7d" → cron dry-run (call handler locally with the
  secret) creates the project once and not twice; Maintenance page reflects status.

### 3.4 Deprecate old recurrence
Remove `RecurrencePanel.jsx` from `ProjectDetail.jsx` and any recurrence write paths (leave the DB
columns; additive-only rule). Migrate any projects using `recurrence != 'none'` into plans by hand
(document in PR description).

---

## Phase 4 — Notifications & weekly digest (standout feature #3)

Email only (no push at this stage), via Resend (free tier is plenty for one user).

### 4.1 Infrastructure
- `api/_lib/email.js`: thin `sendEmail({subject, html})` wrapper over Resend's REST API using
  `RESEND_API_KEY`, always to `DIGEST_TO_EMAIL`. Dark-themed simple HTML template helper.
- Extend `api/cron/maintenance.js` cron slot or add `api/cron/daily.js` (one daily cron is fine —
  Vercel Hobby allows limited crons; **check the account's cron quota; if only one cron is allowed,
  make `/api/cron/daily` do maintenance generation + alerts + digest-on-Mondays**).

### 4.2 Alert rules (daily)
Query with service role; send one combined "Attention needed" email only when non-empty:
- Projects due in ≤3 days or overdue (not Done, not deleted).
- Budget: spend total ≥ 90% of estimate where estimate > 0 (compute in SQL).
- Maintenance projects generated today (so the cron's work is visible).
- Dedupe: `notification_log` table `(id, kind, entity_id, sent_on DATE, UNIQUE(kind, entity_id, sent_on))`
  — and for due/overdue, only re-alert every 3 days (check last sent_on).

### 4.3 Weekly digest (Mondays)
- Server-side reuse of the existing weekly-summary prompt (copy the prompt from
  `src/lib/anthropic.js` `generateWeeklySummary` into the API route; call Anthropic directly with
  `ANTHROPIC_API_KEY` — do not route through `/api/claude`, which now requires a user JWT).
- Include: AI narrative + stats table (spend this week by property, completed count, overdue list).
- Keep the manual "Generate Weekly Summary" button working as-is.
- Acceptance: trigger the cron locally → email arrives; running twice the same day sends nothing the
  second time.

---

## Phase 5 — Document & warranty vault (standout feature #4)

Where the STR permit, appliance warranties, insurance docs, and manuals live — with expiry reminders.

### 5.1 Schema — `011_documents.sql`
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,   -- optional link
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'other'
    CHECK (doc_type IN ('permit','warranty','insurance','manual','quote','invoice','other')),
  storage_path TEXT NOT NULL,
  expires_on DATE,
  vendor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON documents FOR ALL TO authenticated USING (true);
```
Storage path: `project-files/documents/{document_id}/{filename}` (private bucket, signed URLs — Phase 0.5
helpers).

### 5.2 AI extraction on upload
- New `parseDocument(base64, mimeType)` in `src/lib/anthropic.js` (mirrors `parseReceiptImage`):
  returns `{title, doc_type, expires_on, vendor, notes}`. PDFs: send as `document` content block
  (the `/api/claude` proxy passes bodies through; raise its body-size guard to ~1.5 MB for this route).
- Upload flow: drop file → AI prefills the form → user confirms → save. Extraction failure must degrade
  to a blank manual form, never block the upload.

### 5.3 UI
- New route `/documents` + sidebar entry. Grid grouped by property, filter chips by doc_type,
  **"Expiring soon"** amber section pinned on top (≤60 days).
- In `ProjectDetail`, a "Documents" section listing linked docs (reuses `AttachmentsList` patterns —
  consider whether attachments should just *become* documents; if the attachments table is small,
  migrate rows into `documents(doc_type='other')` and retire `useAttachments`).
- Expiry alerts: add expiring documents (≤30 days) to the Phase 4 daily alert email.
- Acceptance: upload a photo of any warranty card → fields prefill → appears under its property →
  shows in "expiring soon" when `expires_on` is near.

---

## Phase 6 — Money upgrades: vendors as records + tax-ready spend (standout feature #5)

Especially valuable because Olmstead is a rental (CRA T776 reporting).

### 6.1 Vendor linkage — `012_vendor_fk.sql`
- `ALTER TABLE projects ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;`
- Backfill: match existing `projects.vendor` free text to `vendors.name` case-insensitively; insert
  missing names as new vendors; then keep the old `vendor` text column (additive rule) but stop writing it.
- UI: vendor field in `ProjectDetail`/`NewProjectModal` becomes a Combobox over vendors with
  "create new" inline (Combobox component already exists).
- Vendors page gains per-vendor job history (projects + total spend via one query) — this is what makes
  the directory actually useful.

### 6.2 Spend classification — `013_spend_categories.sql`
```sql
ALTER TABLE spend_entries
  ADD COLUMN category TEXT DEFAULT 'other' CHECK (category IN
    ('materials','labour','permits_fees','tools','appliances','maintenance_repair','insurance','utilities','other')),
  ADD COLUMN expense_type TEXT CHECK (expense_type IN ('capital','current'));  -- NULL = unclassified
```
- Receipt AI (`parseReceiptImage`) prompt gains `category` and suggested `expense_type` fields;
  the spend entry form shows both as dropdowns (prefilled, editable). Existing entries: a small
  "classify" badge in the spend list for NULL `expense_type`, with an "AI classify all" bulk button
  per project (batch prompt with amounts + notes).
- **Guidance copy, not tax advice:** tooltip explaining capital (improves the property, depreciated)
  vs current (repairs/maintenance, deducted in-year) with a "confirm with your accountant" note.

### 6.3 Reports upgrades
On `src/pages/Reports.jsx`:
- Property + year selectors → spend grouped by category, split capital vs current; totals row.
- **Year-end export** button: CSV per property/year with columns
  `date, project, vendor, category, expense_type, amount, note, receipt_url(signed)` — suitable to hand
  to an accountant for T776 prep.
- Chart: stacked bar of monthly spend by category (Recharts, already a dep).
- Acceptance: a spend entry logged via receipt photo lands classified; the Olmstead 2026 CSV opens in
  Excel with correct totals.

---

## Backlog (explicitly out of scope for now — do not start without asking Nathan)
- TypeScript migration; Supabase Realtime; push notifications; quotes comparison; Sentry;
  full-text search in Postgres (palette's client fuzzy is enough at this size); AI chat copilot page;
  multi-user/org features of any kind; `ProjectDetail.jsx` decomposition (do it opportunistically as
  Phases 5–6 touch it, not as a big-bang refactor).

## Suggested sequence & rough effort

| Phase | PRs | Effort | Depends on |
|---|---|---|---|
| 0 Security | 6 | 2–3 days | — |
| 1 Foundation | 7 | 3–4 days | 0 |
| 2 Command palette | 1–2 | 1–2 days | 1.6 |
| 3 Maintenance | 3 | 3–4 days | 1.1 (migrations), 1.2 (CI) |
| 4 Notifications | 2 | 2 days | 3 (cron) |
| 5 Documents | 2–3 | 2–3 days | 0.5 (signed URLs) |
| 6 Money | 3 | 3 days | 1.1 |

Total: roughly 3–4 focused weeks. Every phase leaves the app deployed and better than before.
