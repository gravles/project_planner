-- ============================================================
-- 003_templates_vendors.sql
-- Adds: vendors table, template/recurrence columns on projects,
--       and makes the storage bucket public for photo URLs.
-- Run in Supabase SQL editor after 002_room_types.sql.
-- ============================================================

-- Vendor directory
CREATE TABLE IF NOT EXISTS vendors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  website     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON vendors FOR ALL TO authenticated USING (true);

-- Template + recurrence columns on projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_template         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS template_name       TEXT,
  ADD COLUMN IF NOT EXISTS recurrence          TEXT DEFAULT 'none'
    CHECK (recurrence IN ('none','weekly','monthly','quarterly','annual')),
  ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Make the storage bucket public so getPublicUrl() works for photos
UPDATE storage.buckets SET public = true WHERE id = 'project-files';

-- Add a public read policy (authenticated policy already exists for write/delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Public read project-files'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Public read project-files"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'project-files')
    $policy$;
  END IF;
END $$;
