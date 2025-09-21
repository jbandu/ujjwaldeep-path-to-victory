-- Guarded auth settings migration (safe across GoTrue versions)

DO $mig$
BEGIN
  -- Preferred path if your GoTrue exposes a helper function:
  -- Some stacks ship auth.set_config(k, v). If it exists, use it.
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND p.proname = 'set_config'
  ) THEN
    -- Auto-confirm emails (no verification step)
    PERFORM auth.set_config('MAILER_AUTOCONFIRM', 'true');

    -- (Optional) also ensure email signups are enabled
    PERFORM auth.set_config('EMAIL_SIGNUP_ENABLED', 'true');

    RETURN;
  END IF;

  -- Fallback path for older GoTrue where auth.config is a table
  IF to_regclass('auth.config') IS NOT NULL THEN
    -- Upsert-style updates (schema can vary; most have "key"/"value" text)
    -- Try update first; if 0 rows, insert.
    -- MAILER_AUTOCONFIRM
    IF (SELECT count(*) FROM auth.config WHERE key = 'MAILER_AUTOCONFIRM') > 0 THEN
      UPDATE auth.config SET value = 'true' WHERE key = 'MAILER_AUTOCONFIRM';
    ELSE
      INSERT INTO auth.config (key, value) VALUES ('MAILER_AUTOCONFIRM', 'true');
    END IF;

    -- EMAIL_SIGNUP_ENABLED
    IF (SELECT count(*) FROM auth.config WHERE key = 'EMAIL_SIGNUP_ENABLED') > 0 THEN
      UPDATE auth.config SET value = 'true' WHERE key = 'EMAIL_SIGNUP_ENABLED';
    ELSE
      INSERT INTO auth.config (key, value) VALUES ('EMAIL_SIGNUP_ENABLED', 'true');
    END IF;

    RETURN;
  END IF;

  -- Nothing to do on this stack
  RAISE NOTICE 'auth.set_config() and auth.config not found; skipping email confirmation toggle';
END
$mig$;

