-- ============================================================
-- 002_room_types.sql
-- Adds configurable room types and property/tag mutations.
-- Run this in the Supabase SQL editor after 001_initial.sql.
-- ============================================================

CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO room_types (name, sort_order) VALUES
  ('Exterior',       1),
  ('Kitchen',        2),
  ('Living Room',    3),
  ('Bedroom',        4),
  ('Bathroom',       5),
  ('Basement',       6),
  ('Electrical',     7),
  ('Permits & Legal',8),
  ('Other',          9);

ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON room_types FOR ALL TO authenticated USING (true);
