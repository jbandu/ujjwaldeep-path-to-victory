-- Fix security issue: Remove direct access to auth.users from v_examday_context view
-- The view was exposing auth.users.email which is a security risk

-- Drop the existing view that exposes auth.users
DROP VIEW IF EXISTS public.v_examday_context;

-- Create a secure version that doesn't expose auth.users data
-- Instead, we'll get email from a secure function when needed
CREATE VIEW public.v_examday_context AS
SELECT 
    p.user_id,
    p.full_name,
    p.home_address,
    p.home_lat,
    p.home_lng,
    p.exam_center_address,
    p.exam_lat,
    p.exam_lng,
    p.exam_city,
    p.exam_date,
    COALESCE(p.exam_arrival_buffer_mins, 45) AS buffer_mins
FROM profiles p;

-- Create a secure function to get user email when needed
-- This function uses SECURITY DEFINER to safely access auth.users
CREATE OR REPLACE FUNCTION public.get_user_email(user_uuid uuid)
RETURNS TEXT AS $$
BEGIN
    -- Only return email for the current authenticated user
    IF auth.uid() = user_uuid THEN
        RETURN (SELECT email FROM auth.users WHERE id = user_uuid);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Enable RLS on the view (inherits from profiles table RLS)
-- No additional RLS needed as it inherits from profiles table