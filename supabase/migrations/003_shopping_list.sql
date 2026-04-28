-- ============================================================
-- 003_shopping_list.sql
-- Adds a global shopping list with per-project item tagging.
-- ============================================================

CREATE TABLE shopping_list_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id  UUID        REFERENCES projects(id) ON DELETE SET NULL,
  text        TEXT        NOT NULL,
  quantity    TEXT,
  checked     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own shopping items"
  ON shopping_list_items FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX shopping_list_items_user_id_idx ON shopping_list_items (user_id);
CREATE INDEX shopping_list_items_project_id_idx ON shopping_list_items (project_id);
