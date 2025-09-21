-- Ensure RLS is on (safe to repeat)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean up any older policies we don't want
DROP POLICY IF EXISTS "update own profile"             ON public.profiles;
DROP POLICY IF EXISTS "upsert own profile"             ON public.profiles;
DROP POLICY IF EXISTS "update own profile restricted"  ON public.profiles;

-- Self update allowed, but only if is_admin is NOT changed by non-admins.
-- Admins can update anything.
CREATE POLICY "profiles:update own (no admin flip)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (
  -- Allow admin to write any change:
  public.is_admin(auth.uid())
  -- For self-writes, require that is_admin stays equal to the current stored value:
  OR (
    user_id = auth.uid()
    AND is_admin IS NOT DISTINCT FROM (
      SELECT p.is_admin FROM public.profiles p WHERE p.user_id = public.profiles.user_id
    )
  )
);

-- (Optional but recommended) add a trigger to hard-block any attempt to flip is_admin
-- unless the caller is an admin. This covers any future policy mistakes as well.
CREATE OR REPLACE FUNCTION public.guard_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'forbidden: cannot change is_admin';
    END IF;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS t_guard_is_admin ON public.profiles;
CREATE TRIGGER t_guard_is_admin
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_is_admin();

