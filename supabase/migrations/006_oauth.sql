-- ============================================================
-- 006_oauth.sql
-- OAuth 2.0 storage for the remote MCP server.
-- These tables are accessed via the service-role key only —
-- no RLS needed.
-- ============================================================

CREATE TABLE IF NOT EXISTS oauth_clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         TEXT UNIQUE NOT NULL,
  client_secret_hash TEXT NOT NULL,
  client_name       TEXT,
  redirect_uris     TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,
  client_id       TEXT NOT NULL,
  redirect_uri    TEXT NOT NULL,
  code_challenge  TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  TEXT UNIQUE NOT NULL,
  client_id   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
