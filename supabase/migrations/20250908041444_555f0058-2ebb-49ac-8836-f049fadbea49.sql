-- Fix the get_all_users_admin function return type mismatch
DROP FUNCTION IF EXISTS public.get_all_users_admin();

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
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow admins to view all users
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can view all users';
  END IF;

  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email::text,
    COALESCE(p.full_name, '')::text as full_name,
    au.created_at,
    au.last_sign_in_at,
    COALESCE(p.is_admin, false) as is_admin,
    COALESCE(t.test_count, 0)::bigint as test_count,
    COALESCE(a.attempt_count, 0)::bigint as attempt_count
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  LEFT JOIN (
    SELECT owner_id, COUNT(*)::bigint as test_count 
    FROM public.tests 
    GROUP BY owner_id
  ) t ON au.id = t.owner_id
  LEFT JOIN (
    SELECT user_id, COUNT(*)::bigint as attempt_count 
    FROM public.attempts 
    GROUP BY user_id
  ) a ON au.id = a.user_id
  ORDER BY au.created_at DESC;
END;
$function$