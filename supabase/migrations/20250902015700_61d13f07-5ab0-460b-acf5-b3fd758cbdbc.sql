-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fuzzy search
CREATE EXTENSION IF NOT EXISTS unaccent;   -- better text search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper: stable function to check admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_admin = true
  );
$$;

-- Create staging table for raw imports
CREATE TABLE IF NOT EXISTS public.staging_questions (
  id bigserial PRIMARY KEY,
  subject text,
  chapter text,
  topic text,
  stem text,
  "optionA" text,
  "optionB" text,
  "optionC" text,
  "optionD" text,
  "correctIndex" int,
  "explanationText" text,
  difficulty int,
  tags text,
  language text,
  source text,
  status text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.staging_questions ENABLE ROW LEVEL SECURITY;

-- Only admins can access staging
CREATE POLICY staging_admin_all
  ON public.staging_questions FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Fast sanity checks
CREATE INDEX IF NOT EXISTS idx_staging_subject ON public.staging_questions (subject);
CREATE INDEX IF NOT EXISTS idx_staging_created_at ON public.staging_questions (created_at DESC);

-- Enrich questions schema for AI metadata
ALTER TABLE public.questions
  ALTER COLUMN correct_index DROP NOT NULL;

-- AI-enriched metadata
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS difficulty_ai int CHECK (difficulty_ai BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS bloom_level text,
  ADD COLUMN IF NOT EXISTS ai_flags jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Keep updated_at automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE TRIGGER trg_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Useful filters
CREATE INDEX IF NOT EXISTS idx_questions_subject_chapter ON public.questions (subject, chapter);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions (status);
CREATE INDEX IF NOT EXISTS idx_questions_correct_index_null ON public.questions (correct_index) WHERE correct_index IS NULL;

-- Create localizations table
CREATE TABLE IF NOT EXISTS public.question_localizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id bigint NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  language text NOT NULL,
  stem text NOT NULL,
  options jsonb NOT NULL,
  explanation jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE (question_id, language)
);

ALTER TABLE public.question_localizations ENABLE ROW LEVEL SECURITY;

-- RLS: public read; admins write
CREATE POLICY qloc_read ON public.question_localizations
  FOR SELECT USING (true);

CREATE POLICY qloc_admin_write ON public.question_localizations
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_qloc_qid_lang ON public.question_localizations (question_id, language);

-- AI task types and status enums
CREATE TYPE public.ai_task_type AS ENUM (
  'explain',
  'difficulty',
  'tags',
  'bloom',
  'translate',
  'qc',
  'summary'
);

CREATE TYPE public.ai_task_status AS ENUM ('queued','processing','done','error');

-- AI tasks table
CREATE TABLE IF NOT EXISTS public.ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type public.ai_task_type NOT NULL,
  question_id bigint REFERENCES public.questions(id) ON DELETE CASCADE,
  locale text,
  payload jsonb,
  status public.ai_task_status DEFAULT 'queued',
  result jsonb,
  error text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY ai_tasks_admin_all
  ON public.ai_tasks FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON public.ai_tasks (status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_qid ON public.ai_tasks (question_id);

-- Keep updated_at for ai_tasks
CREATE OR REPLACE FUNCTION public.set_updated_at_col()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_ai_tasks_updated
BEFORE UPDATE ON public.ai_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_col();

-- Dequeue function for atomic task processing
CREATE OR REPLACE FUNCTION public.ai_dequeue(p_batch int DEFAULT 5)
RETURNS SETOF public.ai_tasks
LANGUAGE sql
SECURITY DEFINER
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

-- Mark task as error
CREATE OR REPLACE FUNCTION public.ai_mark_error(p_task_id uuid, p_error text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_tasks
  SET status = 'error', error = p_error, updated_at = now()
  WHERE id = p_task_id;
$$;

-- Enqueue a task
CREATE OR REPLACE FUNCTION public.ai_enqueue(
  p_task_type public.ai_task_type,
  p_question_id bigint,
  p_locale text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tid uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can enqueue AI tasks';
  END IF;

  INSERT INTO public.ai_tasks (task_type, question_id, locale, payload, status, created_by)
  VALUES (p_task_type, p_question_id, p_locale, p_payload, 'queued', auth.uid())
  RETURNING id INTO tid;

  RETURN tid;
END
$$;

-- Apply AI results
CREATE OR REPLACE FUNCTION public.ai_apply_result(
  p_task_id uuid,
  p_result jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  t record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can apply AI results';
  END IF;

  SELECT * INTO t FROM public.ai_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Update target based on task type
  IF t.task_type = 'explain' THEN
    UPDATE public.questions
      SET explanation = p_result
      WHERE id = t.question_id;

  ELSIF t.task_type = 'difficulty' THEN
    UPDATE public.questions
      SET difficulty_ai = (p_result->>'difficulty')::int
      WHERE id = t.question_id;

  ELSIF t.task_type = 'tags' THEN
    UPDATE public.questions
      SET tags = coalesce( array(SELECT jsonb_array_elements_text(p_result->'tags')), '{}'::text[] )
      WHERE id = t.question_id;

  ELSIF t.task_type = 'bloom' THEN
    UPDATE public.questions
      SET bloom_level = p_result->>'bloom'
      WHERE id = t.question_id;

  ELSIF t.task_type = 'translate' THEN
    INSERT INTO public.question_localizations (question_id, language, stem, options, explanation)
    VALUES (
      t.question_id,
      coalesce(t.locale, p_result->>'language'),
      p_result->>'stem',
      coalesce(p_result->'options','[]'::jsonb),
      p_result->'explanation'
    )
    ON CONFLICT (question_id, language) DO UPDATE
      SET stem = excluded.stem,
          options = excluded.options,
          explanation = excluded.explanation;

  ELSIF t.task_type = 'qc' THEN
    UPDATE public.questions
      SET ai_flags = p_result
      WHERE id = t.question_id;

  END IF;

  UPDATE public.ai_tasks
    SET status = 'done', result = p_result
    WHERE id = p_task_id;
END
$$;