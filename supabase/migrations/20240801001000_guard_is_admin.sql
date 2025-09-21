-- Normalize is_admin overloads WITHOUT dropping (policies depend on it)

-- Core implementation: accepts a UUID (no DEFAULT args)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = uid
      AND p.is_admin = true
  );
$$;

-- Convenience overload: uses current auth.uid()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.is_admin(auth.uid());
$$;

