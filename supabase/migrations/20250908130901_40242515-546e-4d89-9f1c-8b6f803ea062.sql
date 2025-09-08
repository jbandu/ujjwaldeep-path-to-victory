-- Robust fix for ambiguous user_id references in get_all_users_admin
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
 RETURNS TABLE(
   user_id uuid,
   email text,
   full_name text,
   created_at timestamp with time zone,
   last_sign_in_at timestamp with time zone,
   is_admin boolean,
   test_count bigint,
   attempt_count bigint
 )
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow admins to view all users
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can view all users';
  END IF;

  RETURN QUERY
  WITH t_counts AS (
    SELECT owner_id AS test_owner_id, COUNT(*)::bigint AS test_count
    FROM public.tests
    GROUP BY owner_id
  ),
  a_counts AS (
    SELECT user_id AS attempt_user_id, COUNT(*)::bigint AS attempt_count
    FROM public.attempts
    GROUP BY user_id
  )
  SELECT 
    au.id AS user_id,
    au.email::text,
    COALESCE(p.full_name, '')::text AS full_name,
    au.created_at,
    au.last_sign_in_at,
    COALESCE(p.is_admin, false) AS is_admin,
    COALESCE(t.test_count, 0)::bigint AS test_count,
    COALESCE(a.attempt_count, 0)::bigint AS attempt_count
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  LEFT JOIN t_counts t ON au.id = t.test_owner_id
  LEFT JOIN a_counts a ON au.id = a.attempt_user_id
  ORDER BY au.created_at DESC;
END;
$function$