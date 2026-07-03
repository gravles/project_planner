-- ============================================================
-- 007_owner_backfill_and_rls.sql
-- 1. Backfills owner_id on legacy projects (created before 004)
--    and removes the "owner_id IS NULL = everyone owns it"
--    escape hatch from all policies and helper functions.
-- 2. Captures the project_attachments table + the child-table
--    RLS policies that were applied ad hoc to the live database
--    but never recorded in a migration file (idempotent).
-- ============================================================

-- ── project_attachments (was created ad hoc; recorded here) ───
CREATE TABLE IF NOT EXISTS project_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_size    BIGINT,
  mime_type    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

-- ── Backfill owner on legacy projects ─────────────────────────
-- Single-user app: assign all unowned projects to the first user.
UPDATE projects
SET owner_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
WHERE owner_id IS NULL;

-- ── Access helper (single definition used by all policies) ────
CREATE OR REPLACE FUNCTION has_project_access(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
      AND (owner_id = auth.uid()
           OR id IN (SELECT project_id FROM project_collaborators WHERE user_id = auth.uid()))
  );
$$;

-- ── Projects: drop the NULL-owner escape hatch ────────────────
DROP POLICY IF EXISTS "project access" ON projects;
CREATE POLICY "project access" ON projects
  FOR ALL TO authenticated USING (
    owner_id = auth.uid()
    OR id IN (SELECT project_id FROM project_collaborators WHERE user_id = auth.uid())
  );

-- is_project_owner previously treated NULL owner as "everyone owns it"
CREATE OR REPLACE FUNCTION is_project_owner(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id AND owner_id = auth.uid()
  );
$$;

-- get_project_members: same fix for the access precheck
CREATE OR REPLACE FUNCTION get_project_members(p_project_id UUID)
RETURNS TABLE (
  user_id      UUID,
  email        TEXT,
  display_name TEXT,
  role         TEXT,
  is_owner     BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT has_project_access(p_project_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT p.owner_id, pr.email, pr.display_name, 'owner'::TEXT, TRUE
    FROM projects p
    LEFT JOIN profiles pr ON pr.id = p.owner_id
    WHERE p.id = p_project_id AND p.owner_id IS NOT NULL;

  RETURN QUERY
    SELECT pc.user_id, pr.email, pr.display_name, pc.role, FALSE
    FROM project_collaborators pc
    LEFT JOIN profiles pr ON pr.id = pc.user_id
    WHERE pc.project_id = p_project_id;
END;
$$;

-- ── Child tables: scope to parent-project access ──────────────
-- (These replace both the original "Authenticated full access"
-- policies from 001 and the ad hoc "Users access project *"
-- policies on the live database.)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['subtasks','spend_entries','project_photos','activity_log','project_tags','project_attachments']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated full access" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users access project %s" ON %I',
                   CASE t WHEN 'subtasks' THEN 'subtasks'
                          WHEN 'spend_entries' THEN 'spend'
                          WHEN 'project_photos' THEN 'photos'
                          WHEN 'activity_log' THEN 'activity'
                          WHEN 'project_tags' THEN 'tags'
                          WHEN 'project_attachments' THEN 'attachments' END, t);
    EXECUTE format('DROP POLICY IF EXISTS "project scoped" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "project scoped" ON %I FOR ALL TO authenticated
         USING (has_project_access(project_id))
         WITH CHECK (has_project_access(project_id))', t);
  END LOOP;
END $$;
