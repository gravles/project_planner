-- ============================================================
-- 001_initial.sql
-- Run this entire migration in the Supabase SQL editor.
-- ============================================================

-- Properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  icon TEXT DEFAULT '🏠',
  color TEXT DEFAULT '#818cf8',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed properties
INSERT INTO properties (name, address, icon, color, sort_order) VALUES
  ('King George',  '90 King George St, Ottawa', '🏠', '#818cf8', 1),
  ('Coach House',  '90 King George St (Coach House)', '🏡', '#34d399', 2),
  ('Olmstead',     '328 Olmstead St, Ottawa', '🏗️', '#fb923c', 3);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  room TEXT NOT NULL DEFAULT 'Other',
  status TEXT NOT NULL DEFAULT 'Backlog' CHECK (status IN ('Backlog','In Progress','Blocked','Done')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Urgent')),
  due_date DATE,
  estimate_cad NUMERIC(10,2) DEFAULT 0,
  vendor TEXT,
  notes TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subtasks
CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spend log entries
CREATE TABLE spend_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  amount_cad NUMERIC(10,2) NOT NULL,
  note TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos (before/after, progress shots)
CREATE TABLE project_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT,
  photo_type TEXT DEFAULT 'progress' CHECK (photo_type IN ('before','progress','after')),
  taken_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6b7280'
);

CREATE TABLE project_tags (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tag_id)
);

-- Seed tags
INSERT INTO tags (name, color) VALUES
  ('DIY', '#60a5fa'),
  ('Permit Required', '#f59e0b'),
  ('Contractor', '#a78bfa'),
  ('Urgent', '#ef4444'),
  ('Seasonal', '#34d399'),
  ('Airbnb', '#fb923c');

-- ── Triggers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_log (project_id, action, detail)
    VALUES (NEW.id, 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_status_log
  AFTER UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

CREATE OR REPLACE FUNCTION log_spend_added()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (project_id, action, detail)
  VALUES (NEW.project_id, 'spend_added', jsonb_build_object('amount', NEW.amount_cad, 'note', NEW.note));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spend_log_activity
  AFTER INSERT ON spend_entries
  FOR EACH ROW EXECUTE FUNCTION log_spend_added();

-- ── Row Level Security ─────────────────────────────────────────

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON properties FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON projects FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON subtasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON spend_entries FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON project_photos FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON activity_log FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON tags FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated full access" ON project_tags FOR ALL TO authenticated USING (true);

-- ── Storage bucket ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);

CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-files');
CREATE POLICY "Authenticated read"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'project-files');
CREATE POLICY "Authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-files');
