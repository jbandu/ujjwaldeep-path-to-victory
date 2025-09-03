-- Fix the remaining SECURITY DEFINER views by recreating them as regular views

-- Drop and recreate admin views without SECURITY DEFINER
DROP VIEW IF EXISTS public.admin_questions_missing_explanation CASCADE;
DROP VIEW IF EXISTS public.admin_questions_missing_answer CASCADE;  
DROP VIEW IF EXISTS public.admin_questions_missing_hi CASCADE;

-- Recreate admin views as regular views (not SECURITY DEFINER)
CREATE VIEW public.admin_questions_missing_explanation AS
SELECT 
    id,
    stem,
    subject,
    chapter,
    difficulty,
    correct_index,
    options
FROM public.questions 
WHERE explanation IS NULL OR explanation = 'null'::jsonb;

CREATE VIEW public.admin_questions_missing_answer AS
SELECT 
    id,
    stem,
    subject,
    chapter,
    difficulty,
    options,
    language,
    source,
    created_at
FROM public.questions 
WHERE correct_index IS NULL;

CREATE VIEW public.admin_questions_missing_hi AS
SELECT 
    id,
    stem,
    subject,
    chapter
FROM public.questions 
WHERE NOT EXISTS (
    SELECT 1 FROM public.question_localizations ql 
    WHERE ql.question_id = questions.id AND ql.language = 'Hindi'
);

-- Fix remaining functions that need search_path
CREATE OR REPLACE FUNCTION public.ai_apply_result(p_task_id uuid, p_result jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
declare
  t record;
begin
  if not public.is_admin() then
    raise exception 'Only admins can apply AI results';
  end if;

  select * into t from public.ai_tasks where id = p_task_id for update;
  if not found then
    raise exception 'Task not found';
  end if;

  if t.task_type = 'explain' then
    update public.questions
      set explanation = p_result
      where id = t.question_id;

  elsif t.task_type = 'difficulty' then
    update public.questions
      set difficulty_ai = (p_result->>'difficulty')::int
      where id = t.question_id;

  elsif t.task_type = 'tags' then
    update public.questions
      set tags = coalesce( array(select jsonb_array_elements_text(p_result->'tags')), '{}'::text[] )
      where id = t.question_id;

  elsif t.task_type = 'bloom' then
    update public.questions
      set bloom_level = p_result->>'bloom'
      where id = t.question_id;

  elsif t.task_type = 'translate' then
    insert into public.question_localizations (question_id, language, stem, options, explanation)
    values (
      t.question_id,
      coalesce(t.locale, p_result->>'language'),
      p_result->>'stem',
      coalesce(p_result->'options','[]'::jsonb),
      p_result->'explanation'
    )
    on conflict (question_id, language) do update
      set stem = excluded.stem,
          options = excluded.options,
          explanation = excluded.explanation;

  elsif t.task_type = 'qc' then
    update public.questions
      set ai_flags = p_result
      where id = t.question_id;

  end if;

  update public.ai_tasks
    set status = 'done', result = p_result, updated_at = now()
    where id = p_task_id;
end;
$$;