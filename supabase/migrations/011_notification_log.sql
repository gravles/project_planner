-- ============================================================
-- 011_notification_log.sql
-- Dedupe guard for cron-sent email alerts. Service-role access
-- only; RLS enabled with no policies so the anon key sees nothing.
-- ============================================================

CREATE TABLE notification_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       TEXT NOT NULL,          -- 'due' | 'overdue' | 'budget' | 'doc_expiry' | 'digest'
  entity_id  UUID,                   -- project/document id the alert was about
  sent_on    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (kind, entity_id, sent_on)
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
