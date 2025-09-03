-- Fix the remaining security issues from the previous migration

-- 1. First, check what SECURITY DEFINER views exist and fix them
-- Let's see what views are causing issues by checking our leaderboard view
DROP VIEW IF EXISTS public.leaderboard_daily_public;

-- Recreate without SECURITY DEFINER (it was likely inherited from a function)
CREATE VIEW public.leaderboard_daily_public AS
SELECT 
    points,
    day,
    ROW_NUMBER() OVER (PARTITION BY day ORDER BY points DESC) as rank
FROM public.leaderboard_daily;

-- 2. Fix function search paths for existing functions that don't have them set
-- Update AI functions to have proper search_path
CREATE OR REPLACE FUNCTION public.ai_dequeue(p_batch integer DEFAULT 5)
RETURNS SETOF ai_tasks
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH popped AS (
    UPDATE public.ai_tasks t
    SET status = 'processing', updated_at = now()
    WHERE t.id IN (
      SELECT id FROM public.ai_tasks
      WHERE status = 'queued'
      ORDER BY created_at
      LIMIT greatest(1, coalesce(p_batch, 5))
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  )
  SELECT * FROM popped;
$$;

CREATE OR REPLACE FUNCTION public.ai_mark_error(p_task_id uuid, p_error text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  UPDATE public.ai_tasks
  SET status = 'error', error = p_error, updated_at = now()
  WHERE id = p_task_id;
$$;

CREATE OR REPLACE FUNCTION public.ai_enqueue(p_task_type ai_task_type, p_question_id bigint, p_locale text DEFAULT NULL::text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
declare
  tid uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can enqueue AI tasks';
  end if;

  insert into public.ai_tasks (task_type, question_id, locale, payload, status, created_by)
  values (p_task_type, p_question_id, p_locale, p_payload, 'queued', auth.uid())
  returning id into tid;

  return tid;
end;
$$;