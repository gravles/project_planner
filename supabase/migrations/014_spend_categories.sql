-- ============================================================
-- 014_spend_categories.sql
-- Spend classification for reporting and rental-property tax prep:
-- category (what the money bought) and expense_type (capital vs
-- current — the CRA distinction for rentals). expense_type stays
-- NULL until classified.
-- ============================================================

ALTER TABLE spend_entries
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('materials','labour','permits_fees','tools','appliances','maintenance_repair','insurance','utilities','other')),
  ADD COLUMN IF NOT EXISTS expense_type TEXT
    CHECK (expense_type IN ('capital','current'));
