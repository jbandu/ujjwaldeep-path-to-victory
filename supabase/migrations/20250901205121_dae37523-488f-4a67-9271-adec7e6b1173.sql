-- SAFE, IDEMPOTENT PATCH FOR CONSTRAINTS/POLICIES/VIEW
-- This file assumes the core tables may or may not exist yet locally.

-------------------------------------------------------------------------------
-- 1) Guarded ALTERs & constraints (only run if tables/columns exist)
-------------------------------------------------------------------------------
DO $mig$
BEGIN
  -- attempts.user_id SET NOT NULL
  IF to_regclass('public.attempts') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='attempts' AND column_name='user_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.attempts ALTER COLUMN user_id SET NOT NULL';
    END IF;
  END IF;

  -- items_attempted: SET NOT NULL on key columns
  IF to_regclass('public.items_attempted') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='items_attempted' AND column_name='attempt_id') THEN
      EXECUTE 'ALTER TABLE public.items_attempted ALTER COLUMN attempt_id SET NOT NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='items_attempted' AND column_name='question_id') THEN
      EXECUTE 'ALTER TABLE public.items_attempted ALTER COLUMN question_id SET NOT NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='items_attempted' AND column_name='selected_index') THEN
      EXECUTE 'ALTER TABLE public.items_attempted ALTER COLUMN selected_index SET NOT NULL';
    END IF;
  END IF;

  -- items_attempted: UNIQUE (attempt_id, question_id)
  IF to_regclass('public.items_attempted') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='unique_attempt_question') THEN
      EXECUTE 'ALTER TABLE public.items_attempted
               ADD CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id)';
    END IF;
  END IF;

  -- attempts.test_id FK -> tests(id)
  IF to_regclass('public.attempts') IS NOT NULL
     AND to_regclass('public.tests') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_attempts_test_id') THEN
      EXECUTE 'ALTER TABLE public.attempts
               ADD CONSTRAINT fk_attempts_test_id
               FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE';
    END IF;
  END IF;

  -- items_attempted.attempt_id FK -> attempts(id)
  IF to_regclass('public.items_attempted') IS NOT NULL
     AND to_regclass('public.attempts') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_items_attempted_attempt_id') THEN
      EXECUTE 'ALTER TABLE public.items_attempted
               ADD CONSTRAINT fk_items_attempted_attempt_id
               FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE';
    END IF;
  END IF;
END
$mig$;

-------------------------------------------------------------------------------
-- 2) Leaderboard public view (only if base table exists)
-------------------------------------------------------------------------------
DO $mig$
BEGIN
  IF to_regclass('public.leaderboard_daily') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE OR REPLACE VIEW public.leaderboard_daily_public AS
      SELECT
        day,
        points,
        row_number() OVER (PARTITION BY day ORDER BY points DESC) AS rank
      FROM public.leaderboard_daily
      ORDER BY day DESC, points DESC
    $sql$;

    -- Ensure RLS is enabled on source table before editing policies
    EXECUTE 'ALTER TABLE public.leaderboard_daily ENABLE ROW LEVEL SECURITY';

    -- Replace policy safely
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "read daily leaderboard public" ON public.leaderboard_daily';
    EXCEPTION WHEN undefined_object THEN
      -- ignore
    END;

    -- Restrictive policy: only a user can read their own row (adjust as needed)
    -- If you prefer showing anonymized ranks to everyone, change USING(true) but expose only the view.
    BEGIN
      EXECUTE $sql$
        CREATE POLICY "read daily leaderboard restricted"
        ON public.leaderboard_daily
        FOR SELECT
        USING (auth.uid() = user_id)
      $sql$;
    EXCEPTION WHEN duplicate_object THEN
      -- ignore
    END;

    -- Grant read on the public view to both roles
    EXECUTE 'GRANT SELECT ON public.leaderboard_daily_public TO authenticated, anon';
  END IF;
END
$mig$;

