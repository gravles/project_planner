# Home Projects

A personal home-improvement project tracker for managing renovation work, budgets,
photos, vendors, and maintenance across multiple properties. Single-user by design.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite, Tailwind CSS |
| Server state | TanStack React Query · UI state: Zustand |
| Database / Auth / Storage | Supabase (Postgres, email auth, private storage bucket) |
| Hosting | Vercel (SPA + serverless functions in `api/`) |
| AI | Anthropic Claude via the authenticated `/api/claude` proxy |
| Integrations | Remote MCP server at `/api/mcp` (OAuth 2.0 + PKCE, password-gated authorize) |

## Local setup

```bash
npm ci
cp .env.example .env   # fill in the two VITE_ values from the Supabase dashboard
npm run dev
```

`npm run lint`, `npm run test:run`, and `npm run build` must pass before opening a PR.

## Environment variables

Client (`.env`, Vite-inlined at build time):

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Server-side (Vercel → Project Settings → Environment Variables):

- `ANTHROPIC_API_KEY` — used by `/api/claude` and the cron digest
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OAUTH_JWT_SECRET`, `MCP_SECRET`, `MCP_AUTHORIZE_PASSWORD` — MCP server + OAuth
- `CRON_SECRET` — protects `/api/cron/daily`
- `RESEND_API_KEY`, `DIGEST_TO_EMAIL` — email alerts and the Monday digest

## Database migrations

Migrations live in `supabase/migrations/` and are plain SQL, applied in filename
order. Apply new migrations via the Supabase SQL editor or MCP `apply_migration`.
Rules: **additive only** (never drop/rename in the same release as dependent code),
and migrations ship **before** the app code that needs them. Exception:
`008_private_bucket.sql` must be applied **after** the signed-URL code deploys —
see the note in that file.

## Deployment

Push to `main` → Vercel builds and deploys. Crons are configured in `vercel.json`
(`/api/cron/daily` runs every morning: maintenance generation, alerts, Monday digest).

Post-deploy smoke check: log in → board loads → open a project → toggle a subtask →
add a spend entry → upload a photo → AI quick-add parses → share link renders logged-out.

## Project plan

The active roadmap and conventions are in [PLAN.md](PLAN.md).
