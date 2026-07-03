-- ============================================================
-- 013_vendor_fk.sql
-- Links projects to vendor records. The free-text projects.vendor
-- column stays (denormalized display + AI context) but the app now
-- keeps vendor_id in sync when the vendor field changes.
--
-- Note: the live vendors table has a NOT NULL user_id + set_user_id()
-- trigger (added ad hoc, not in repo migrations), so server-side
-- inserts must supply user_id explicitly.
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;

-- Vendors that only exist as free text on projects become records
INSERT INTO vendors (name, user_id)
SELECT DISTINCT trim(p.vendor), (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
FROM projects p
WHERE p.vendor IS NOT NULL AND trim(p.vendor) <> ''
  AND NOT EXISTS (SELECT 1 FROM vendors v WHERE lower(v.name) = lower(trim(p.vendor)));

-- Link existing projects by exact (case-insensitive) name
UPDATE projects p SET vendor_id = v.id
FROM vendors v
WHERE p.vendor IS NOT NULL
  AND lower(v.name) = lower(trim(p.vendor))
  AND p.vendor_id IS NULL;
