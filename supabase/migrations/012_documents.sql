-- ============================================================
-- 012_documents.sql
-- Document & warranty vault: permits, warranties, insurance,
-- manuals — per property, optionally linked to a project, with
-- expiry dates that feed the daily alert email.
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'other'
    CHECK (doc_type IN ('permit','warranty','insurance','manual','quote','invoice','other')),
  storage_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  expires_on DATE,
  vendor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX documents_property_idx ON documents (property_id);
CREATE INDEX documents_expiry_idx ON documents (expires_on) WHERE expires_on IS NOT NULL;
