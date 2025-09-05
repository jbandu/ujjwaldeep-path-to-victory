-- Create function to cascade delete all user data
CREATE OR REPLACE FUNCTION public.cascade_delete_user_data(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_counts jsonb := '{}';
  temp_count int;
BEGIN
  -- Only allow admins to delete user data
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete user data';
  END IF;

  -- Delete from items_attempted (via attempts)
  DELETE FROM items_attempted 
  WHERE attempt_id IN (
    SELECT id FROM attempts WHERE user_id = target_user_id
  );
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{items_attempted}', to_jsonb(temp_count));

  -- Delete from print_uploads
  DELETE FROM print_uploads WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{print_uploads}', to_jsonb(temp_count));

  -- Delete from attempts
  DELETE FROM attempts WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{attempts}', to_jsonb(temp_count));

  -- Delete from tests owned by user
  DELETE FROM tests WHERE owner_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{tests}', to_jsonb(temp_count));

  -- Delete from gamification
  DELETE FROM gamification WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{gamification}', to_jsonb(temp_count));

  -- Delete from leaderboard_daily
  DELETE FROM leaderboard_daily WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{leaderboard_daily}', to_jsonb(temp_count));

  -- Delete from user_subscriptions
  DELETE FROM user_subscriptions WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{user_subscriptions}', to_jsonb(temp_count));

  -- Delete from payments
  DELETE FROM payments WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{payments}', to_jsonb(temp_count));

  -- Delete from invoices
  DELETE FROM invoices WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{invoices}', to_jsonb(temp_count));

  -- Delete from profiles (this should be last as it's the main user record)
  DELETE FROM profiles WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := jsonb_set(deleted_counts, '{profiles}', to_jsonb(temp_count));

  RETURN deleted_counts;
END;
$$;

-- Create function to get all users with profile info
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_admin boolean,
  test_count bigint,
  attempt_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to view all users
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can view all users';
  END IF;

  RETURN QUERY
  SELECT
    au.id AS user_id,
    au.email,
    p.full_name,
    au.created_at,
    au.last_sign_in_at,
    COALESCE(p.is_admin, false) as is_admin,
    COALESCE(t.test_count, 0) as test_count,
    COALESCE(a.attempt_count, 0) as attempt_count
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  LEFT JOIN (
    SELECT owner_id, COUNT(*) as test_count
    FROM public.tests
    GROUP BY owner_id
  ) t ON t.owner_id = au.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as attempt_count
    FROM public.attempts
    GROUP BY user_id
  ) a ON a.user_id = au.id
  ORDER BY au.created_at DESC;
END;
$$;