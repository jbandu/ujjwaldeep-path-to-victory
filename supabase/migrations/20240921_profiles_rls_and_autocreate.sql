-- Profiles RLS + Auto-create-on-signup (idempotent)
-- Safe to run multiple times; skips if tables don't exist.

-------------------------------
-- 0) Guards / sanity
-------------------------------
DO $mig$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE NOTICE 'profiles table not found; skipping RLS & policies';
  END IF;

  IF to_regclass('auth.users') IS NULL THEN
    RAISE NOTICE 'auth.users table not found; skipping trigger';
  END IF;
END
$mig$;

-------------------------------
-- 1) Enable RLS on profiles
-------------------------------
DO $mig$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    -- Will no-op if already enabled
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
  END IF;
END
$mig$;

-------------------------------
-- 2) Clean, predictable policies
-------------------------------
DO $mig$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    -- Drop old/previously-named policies if they exist (safe)
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "profiles:insert own" ON public.profiles';
      EXECUTE 'DROP POLICY IF EXISTS "profiles:select self or admin" ON public.profiles';
      EXECUTE 'DROP POLICY IF EXISTS "profiles:update self (no admin flip)" ON public.profiles';
      EXECUTE 'DROP POLICY IF EXISTS "update own profile" ON public.profiles';
      EXECUTE 'DROP POLICY IF EXISTS "upsert own profile" ON public.profiles';
      EXECUTE 'DROP POLICY IF EXISTS "update own profile restricted" ON public.profiles';
    EXCEPTION WHEN undefined_object THEN
      -- ignore
    END;

    -- Insert: a logged-in user may create ONLY their own profile row
    EXECUTE $sql$
      CREATE POLICY "profiles:insert own"
      ON public.profiles
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
    $sql$;

    -- Select: user can read self; admin can read all
    EXECUTE $sql$
      CREATE POLICY "profiles:select self or admin"
      ON public.profiles
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
    $sql$;

    -- Update: user can update own row but cannot flip is_admin;
    -- admin can update anything
    EXECUTE $sql$
      CREATE POLICY "profiles:update self (no admin flip)"
      ON public.profiles
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
      WITH CHECK (
        public.is_admin(auth.uid())
        OR (
          user_id = auth.uid()
          AND is_admin IS NOT DISTINCT FROM (
            SELECT p.is_admin
            FROM public.profiles p
            WHERE p.user_id = public.profiles.user_id
          )
        )
      );
    $sql$;

  END IF;
END
$mig$;

-------------------------------
-- 3) Auto-create profile on auth.users insert
--    (SECURITY DEFINER to bypass profiles RLS)
-------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $fn$
BEGIN
  -- Insert default profile for new auth user (idempotent via ON CONFLICT)
  INSERT INTO public.profiles (user_id, full_name, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    false
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END
$fn$;

-- Make sure the trigger exists (safe to re-run)
DO $mig$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users';
    EXECUTE 'CREATE TRIGGER on_auth_user_created
             AFTER INSERT ON auth.users
             FOR EACH ROW
             EXECUTE FUNCTION public.handle_new_user()';
  END IF;
END
$mig$;

-------------------------------
-- 4) Optional: make yourself admin locally (comment out in prod)
--    Replace the email below if you want an automatic local admin.
-------------------------------
-- DO $mig$
-- BEGIN
--   IF to_regclass('public.profiles') IS NOT NULL THEN
--     UPDATE public.profiles
--        SET is_admin = true
--      WHERE user_id = (SELECT id FROM auth.users WHERE email = 'jbandu@gmail.com')
--        AND is_admin IS DISTINCT FROM true;
--     RAISE NOTICE 'Ensured local admin flag for jbandu@gmail.com (if user exists)';
--   END IF;
-- END
-- $mig$;

-------------------------------
-- 5) Friendly notice
-------------------------------
DO $mig$
BEGIN
  RAISE NOTICE 'Profiles RLS + auto-create migration applied (idempotent).';
END
$mig$;

