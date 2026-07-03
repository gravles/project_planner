-- ============================================================
-- 009_soft_delete.sql
-- Projects are soft-deleted (deleted_at) so deletes are undoable
-- from the UI. Hard deletes no longer happen from the app.
-- ============================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
