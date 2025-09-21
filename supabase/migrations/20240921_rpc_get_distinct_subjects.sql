-- Expose a simple RPC to list distinct subjects from public.questions.
-- Idempotent & safe to re-run.

-- 1) Ensure table exists before creating RPC
DO $mig$
BEGIN
  IF to_regclass('public.questions') IS NULL THEN
    RAISE NOTICE 'public.questions not found; skipping RPC creation';
    RETURN;
  END IF;
END
$mig$;

-- 2) Create or replace the RPC
-- Optional param `lang`: when provided, filter by questions.language
CREATE OR REPLACE FUNCTION public.get_distinct_subjects(lang text DEFAULT NULL)
RETURNS TABLE(subject text)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT q.subject
  FROM public.questions q
  WHERE (lang IS NULL OR q.language = lang)
    AND COALESCE(q.status, 'active') = 'active'
  ORDER BY 1
$$;

-- 3) Allow anon & authenticated to execute the function
GRANT EXECUTE ON FUNCTION public.get_distinct_subjects(text) TO anon, authenticated;

