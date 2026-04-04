-- ============================================================
-- 005_fix_rls_recursion.sql
-- Fixes infinite recursion in projects/project_collaborators RLS.
--
-- Root cause: projects policy queries project_collaborators, and
-- project_collaborators policy queries projects → circular.
--
-- Fix: use a SECURITY DEFINER function to check ownership so the
-- collaborators/invitations policies never hit the projects RLS.
-- ============================================================

-- Bypasses RLS (runs as the function owner / superuser role)
CREATE OR REPLACE FUNCTION is_project_owner(p_project_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
      AND (owner_id = auth.uid() OR owner_id IS NULL)
  );
$$;

-- project_collaborators: replace the policy that queried projects directly
DROP POLICY IF EXISTS "owners manage collaborators" ON project_collaborators;
CREATE POLICY "owners manage collaborators" ON project_collaborators
  FOR ALL TO authenticated
  USING (is_project_owner(project_id))
  WITH CHECK (is_project_owner(project_id));

-- project_invitations: same fix
DROP POLICY IF EXISTS "owners manage invitations" ON project_invitations;
CREATE POLICY "owners manage invitations" ON project_invitations
  FOR ALL TO authenticated
  USING (is_project_owner(project_id))
  WITH CHECK (is_project_owner(project_id));
