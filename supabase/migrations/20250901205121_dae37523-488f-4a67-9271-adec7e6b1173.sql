-- Add unique constraint to prevent duplicate responses
ALTER TABLE public.items_attempted 
ADD CONSTRAINT unique_attempt_question UNIQUE (attempt_id, question_id);

-- Add NOT NULL constraints for data integrity
ALTER TABLE public.attempts 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.items_attempted 
ALTER COLUMN attempt_id SET NOT NULL,
ALTER COLUMN question_id SET NOT NULL,
ALTER COLUMN selected_index SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE public.attempts 
ADD CONSTRAINT fk_attempts_test_id 
FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;

ALTER TABLE public.items_attempted 
ADD CONSTRAINT fk_items_attempted_attempt_id 
FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;

-- Create public leaderboard view without user_id exposure
CREATE VIEW public.leaderboard_daily_public AS
SELECT 
  day,
  points,
  ROW_NUMBER() OVER (PARTITION BY day ORDER BY points DESC) as rank
FROM public.leaderboard_daily
ORDER BY day DESC, points DESC;

-- Restrict direct access to leaderboard_daily table
DROP POLICY IF EXISTS "read daily leaderboard public" ON public.leaderboard_daily;

CREATE POLICY "read daily leaderboard restricted" 
ON public.leaderboard_daily 
FOR SELECT 
USING (auth.uid() = user_id);

-- Grant access to public view
GRANT SELECT ON public.leaderboard_daily_public TO authenticated, anon;