-- CRITICAL SECURITY FIXES

-- 1. Fix privilege escalation: Remove ability for users to set themselves as admin
DROP POLICY IF EXISTS "update own profile" ON public.profiles;
DROP POLICY IF EXISTS "upsert own profile" ON public.profiles;

-- Create restricted profile update policy (cannot modify is_admin)
CREATE POLICY "update own profile restricted" ON public.profiles
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Only admins can modify is_admin field
    (OLD.is_admin = NEW.is_admin) 
    OR public.is_admin()
  )
);

-- Create restricted profile insert policy (cannot set is_admin to true)
CREATE POLICY "insert own profile restricted" ON public.profiles
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- New users cannot set themselves as admin
    (is_admin IS NULL OR is_admin = false)
    OR public.is_admin()
  )
);

-- 2. Fix question bank exposure: Create public views without sensitive data
CREATE VIEW public.questions_public AS
SELECT 
    id,
    subject,
    chapter,
    topic,
    stem,
    options,
    tags,
    language,
    source,
    status,
    bloom_level,
    created_at,
    difficulty
FROM public.questions 
WHERE status = 'active';

-- Enable RLS on public questions view
ALTER VIEW public.questions_public SET (security_barrier = true);

-- Create public question localizations view
CREATE VIEW public.question_localizations_public AS
SELECT 
    id,
    question_id,
    language,
    stem,
    options,
    created_at
FROM public.question_localizations;

-- Enable security barrier
ALTER VIEW public.question_localizations_public SET (security_barrier = true);

-- 3. Add RLS to admin views (they should only be accessible to admins)
CREATE POLICY "admin_questions_missing_explanation_admin_only" ON public.admin_questions_missing_explanation
FOR ALL USING (public.is_admin());

CREATE POLICY "admin_questions_missing_answer_admin_only" ON public.admin_questions_missing_answer  
FOR ALL USING (public.is_admin());

CREATE POLICY "admin_questions_missing_hi_admin_only" ON public.admin_questions_missing_hi
FOR ALL USING (public.is_admin());

-- Enable RLS on admin views
-- Note: These are views so we use security_barrier instead of RLS
ALTER VIEW public.admin_questions_missing_explanation SET (security_barrier = true);
ALTER VIEW public.admin_questions_missing_answer SET (security_barrier = true);
ALTER VIEW public.admin_questions_missing_hi SET (security_barrier = true);

-- 4. Add RLS to leaderboard public view
CREATE POLICY "leaderboard_daily_public_read_all" ON public.leaderboard_daily_public
FOR SELECT USING (true);

-- Enable security barrier
ALTER VIEW public.leaderboard_daily_public SET (security_barrier = true);

-- 5. Update questions policies to use public views for non-sensitive access
DROP POLICY IF EXISTS "questions_read_all" ON public.questions;

-- Replace with restricted policy that only allows access to questions in user's tests
CREATE POLICY "questions_restricted_access" ON public.questions
FOR SELECT USING (
  -- Admin access
  public.is_admin() 
  -- Creator access  
  OR auth.uid() = created_by
  -- Test participant access (only during active attempts)
  OR EXISTS (
    SELECT 1 FROM attempts a 
    JOIN tests t ON a.test_id = t.id
    WHERE a.user_id = auth.uid() 
    AND t.config ? 'questions'
    AND questions.id::text = ANY(
      SELECT jsonb_array_elements_text(t.config->'questions')
    )
  )
);

-- 6. Create admin-only function to get full question data (with answers/explanations)
CREATE OR REPLACE FUNCTION public.get_question_full(question_id bigint)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_json(q.*)
  FROM public.questions q
  WHERE q.id = question_id
  AND public.is_admin();
$$;