-- Add exam-day fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_address text,
  ADD COLUMN IF NOT EXISTS home_lat double precision,
  ADD COLUMN IF NOT EXISTS home_lng double precision,
  ADD COLUMN IF NOT EXISTS exam_center_address text,
  ADD COLUMN IF NOT EXISTS exam_lat double precision,
  ADD COLUMN IF NOT EXISTS exam_lng double precision,
  ADD COLUMN IF NOT EXISTS exam_date timestamptz,
  ADD COLUMN IF NOT EXISTS exam_city text,
  ADD COLUMN IF NOT EXISTS exam_arrival_buffer_mins int default 45;

-- Create view for exam-day email function
CREATE OR REPLACE VIEW public.v_examday_context AS
SELECT
  u.id as user_id,
  u.email,
  p.full_name,
  p.home_address, 
  p.home_lat, 
  p.home_lng,
  p.exam_center_address, 
  p.exam_lat, 
  p.exam_lng,
  p.exam_city,
  p.exam_date,
  COALESCE(p.exam_arrival_buffer_mins, 45) as buffer_mins
FROM auth.users u
JOIN public.profiles p ON p.user_id = u.id;

-- Grant access to the view
GRANT SELECT ON public.v_examday_context TO authenticated;
GRANT SELECT ON public.v_examday_context TO service_role;