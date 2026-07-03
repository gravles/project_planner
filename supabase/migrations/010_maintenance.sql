-- ============================================================
-- 010_maintenance.sql
-- Preventive maintenance plans: recurring seasonal upkeep that
-- auto-generates real projects via the daily cron.
-- Replaces the old per-project recurrence columns (left in place,
-- no longer written).
-- ============================================================

CREATE TABLE maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('monthly','quarterly','biannual','annual')),
  anchor_month INTEGER CHECK (anchor_month BETWEEN 1 AND 12), -- for annual/biannual/quarterly phase
  lead_days INTEGER NOT NULL DEFAULT 14,       -- create the project this many days before due
  checklist JSONB NOT NULL DEFAULT '[]',        -- [{"text": "..."}]
  estimate_cad NUMERIC(10,2) DEFAULT 0,
  room TEXT DEFAULT 'Other',
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Urgent')),
  vendor TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_generated_due DATE,                      -- dedupe guard for the generator
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE maintenance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access" ON maintenance_plans
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS maintenance_plan_id UUID REFERENCES maintenance_plans(id) ON DELETE SET NULL;
