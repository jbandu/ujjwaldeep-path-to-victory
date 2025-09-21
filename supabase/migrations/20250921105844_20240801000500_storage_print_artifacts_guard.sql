-- Idempotent storage setup for print artifacts (no create_bucket() calls)

-- 1) Ensure buckets exist (works on all CLI versions)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('print-artifacts', 'print-artifacts', false),
  ('print-uploads',  'print-uploads',  false)
ON CONFLICT (id) DO NOTHING;

-- 2) Create policies only if storage.objects & referenced tables exist
DO $mig$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL
     AND to_regclass('public.tests') IS NOT NULL
     AND to_regclass('public.print_packages') IS NOT NULL THEN

    -- Drop old policies if present (idempotent)
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "Allow reading print artifacts for test owners" ON storage.objects';
      EXECUTE 'DROP POLICY IF EXISTS "Allow uploading print artifacts for test owners" ON storage.objects';
      EXECUTE 'DROP POLICY IF EXISTS "Allow reading own print uploads" ON storage.objects';
      EXECUTE 'DROP POLICY IF EXISTS "Allow uploading own print uploads" ON storage.objects';
    EXCEPTION WHEN undefined_object THEN
      -- ignore
    END;

    -- print-artifacts (test owners & admins can read/upload artifacts)
    EXECUTE $sql$
      CREATE POLICY "Allow reading print artifacts for test owners"
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'print-artifacts' AND
        (
          public.is_admin() OR
          EXISTS (
            SELECT 1
            FROM public.tests t
            JOIN public.print_packages pp ON pp.test_id = t.id
            WHERE t.owner_id = auth.uid()
              -- object key like: <print_package_id>/<filename>
              AND storage.filename(name) LIKE pp.id::text || '%'
          )
        )
      )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "Allow uploading print artifacts for test owners"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'print-artifacts' AND
        (
          public.is_admin() OR
          EXISTS (
            SELECT 1
            FROM public.tests t
            JOIN public.print_packages pp ON pp.test_id = t.id
            WHERE t.owner_id = auth.uid()
              AND storage.filename(name) LIKE pp.id::text || '%'
          )
        )
      )
    $sql$;

    -- print-uploads (users can read/upload only their own uploads; admins read all)
    EXECUTE $sql$
      CREATE POLICY "Allow reading own print uploads"
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'print-uploads' AND
        (
          public.is_admin() OR
          -- key format: print-uploads/<testId>/<userId>/...
          auth.uid()::text = split_part(name, '/', 2)  -- adjust if your path differs
        )
      )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "Allow uploading own print uploads"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'print-uploads' AND
        auth.uid()::text = split_part(name, '/', 2)    -- adjust if your path differs
      )
    $sql$;

  ELSE
    RAISE NOTICE 'storage.objects or referenced tables missing; skipping storage policies';
  END IF;
END
$mig$;

