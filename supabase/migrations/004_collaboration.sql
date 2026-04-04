-- ============================================================
-- 004_collaboration.sql
-- Adds user profiles, project ownership, and collaboration.
-- Run in Supabase SQL editor.
-- ============================================================

-- ── Profiles ──────────────────────────────────────────────────
-- Mirrors auth.users so we can search by email from the client.

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT UNIQUE,
  display_name TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Backfill existing users
INSERT INTO profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ── Project ownership ─────────────────────────────────────────

ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Auto-set owner on new projects
CREATE OR REPLACE FUNCTION set_project_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_set_project_owner ON projects;
CREATE TRIGGER tr_set_project_owner
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION set_project_owner();


-- ── Project collaborators ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_collaborators (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('viewer', 'editor')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

-- Project owners can fully manage collaborators
CREATE POLICY "owners manage collaborators" ON project_collaborators
  FOR ALL TO authenticated USING (
    project_id IN (
      SELECT id FROM projects
      WHERE owner_id = auth.uid() OR owner_id IS NULL
    )
  );

-- Collaborators can see their own entries
CREATE POLICY "collaborators read own entries" ON project_collaborators
  FOR SELECT TO authenticated USING (user_id = auth.uid());


-- ── Project invitations ────────────────────────────────────────
-- For users who haven't signed up yet.

CREATE TABLE IF NOT EXISTS project_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('viewer', 'editor')),
  invited_by  UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, email)
);

ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- Owners manage invitations on their projects
CREATE POLICY "owners manage invitations" ON project_invitations
  FOR ALL TO authenticated USING (
    project_id IN (
      SELECT id FROM projects
      WHERE owner_id = auth.uid() OR owner_id IS NULL
    )
  );

-- Invited users can read and update their own invitations
CREATE POLICY "invitees read own invitations" ON project_invitations
  FOR SELECT TO authenticated USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "invitees accept own invitations" ON project_invitations
  FOR UPDATE TO authenticated USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );


-- ── Update projects RLS ────────────────────────────────────────
-- Replace the open "Authenticated full access" policy with one
-- that scopes access to owners + collaborators.
-- owner_id IS NULL covers all projects created before this migration
-- (they remain accessible to every authenticated user).

DROP POLICY IF EXISTS "Authenticated full access" ON projects;

CREATE POLICY "project access" ON projects
  FOR ALL TO authenticated USING (
    owner_id IS NULL
    OR owner_id = auth.uid()
    OR id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid()
    )
  );


-- ── Helper function ────────────────────────────────────────────
-- Returns the project's owner_id + collaborator list for a given
-- project, callable from the client without service-role key.

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
  -- Only return results if the caller has access to this project
  IF NOT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id
      AND (owner_id IS NULL OR owner_id = auth.uid()
           OR id IN (SELECT project_id FROM project_collaborators WHERE user_id = auth.uid()))
  ) THEN
    RETURN;
  END IF;

  -- Owner
  RETURN QUERY
    SELECT
      p.owner_id,
      pr.email,
      pr.display_name,
      'owner'::TEXT,
      TRUE
    FROM projects p
    LEFT JOIN profiles pr ON pr.id = p.owner_id
    WHERE p.id = p_project_id AND p.owner_id IS NOT NULL;

  -- Collaborators
  RETURN QUERY
    SELECT
      pc.user_id,
      pr.email,
      pr.display_name,
      pc.role,
      FALSE
    FROM project_collaborators pc
    LEFT JOIN profiles pr ON pr.id = pc.user_id
    WHERE pc.project_id = p_project_id;
END;
$$;
