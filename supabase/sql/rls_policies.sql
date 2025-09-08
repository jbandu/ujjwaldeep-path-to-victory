-- RLS Policies for reliable test flow
-- This file contains the essential RLS policies to fix 403 errors in Start Test flow

-- Allow authenticated users to manage their own attempts
DROP POLICY IF EXISTS "attempts: own rows" ON public.attempts;
CREATE POLICY "attempts: own rows"
ON public.attempts
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow users to read tests they own or shared tests
DROP POLICY IF EXISTS "tests: read owner/shared" ON public.tests;
CREATE POLICY "tests: read owner/shared"
ON public.tests
FOR SELECT
TO authenticated
USING ((owner_id = auth.uid()) OR (visibility = ANY (ARRAY['shared'::text, 'school'::text])));

-- Allow users to insert tests they own
DROP POLICY IF EXISTS "tests: insert by owner" ON public.tests;
CREATE POLICY "tests: insert by owner"
ON public.tests
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Allow reading active questions for all authenticated users
DROP POLICY IF EXISTS "questions: read active" ON public.questions;
CREATE POLICY "questions: read active"
ON public.questions
FOR SELECT
TO authenticated
USING (status = 'active');

-- Allow reading print packages for accessible tests
DROP POLICY IF EXISTS "print_packages: read for accessible tests" ON public.print_packages;
CREATE POLICY "print_packages: read for accessible tests"
ON public.print_packages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tests t
    WHERE t.id = print_packages.test_id
      AND ((t.owner_id = auth.uid()) OR (t.visibility = ANY (ARRAY['shared'::text, 'school'::text])))
  )
);

-- Allow users to manage their own gamification
DROP POLICY IF EXISTS "gamification: own row" ON public.gamification;
CREATE POLICY "gamification: own row"
ON public.gamification
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Ensure proper table grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attempts TO authenticated;
GRANT SELECT, INSERT ON TABLE public.tests TO authenticated;
GRANT SELECT ON TABLE public.questions TO authenticated;
GRANT SELECT ON TABLE public.print_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.gamification TO authenticated;