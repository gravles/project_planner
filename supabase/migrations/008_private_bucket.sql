-- ============================================================
-- 008_private_bucket.sql
-- Makes the project-files bucket private again (receipts and
-- home photos should not be world-readable) and removes the
-- public-read policy added in 003_templates_vendors.sql.
--
-- ⚠️ APPLY THIS ONLY AFTER the signed-URL app code is deployed
-- to production. Signed URLs work against a public bucket, so
-- the safe order is: deploy code → apply this migration.
-- ============================================================

UPDATE storage.buckets SET public = false WHERE id = 'project-files';

DROP POLICY IF EXISTS "Public read project-files" ON storage.objects;
