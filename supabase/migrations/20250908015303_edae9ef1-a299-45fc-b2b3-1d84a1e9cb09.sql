-- Add RLS policy for items_attempted table to support own attempts

-- Enable RLS on items_attempted if not already enabled
ALTER TABLE public.items_attempted ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "items_attempted: for own attempts" ON public.items_attempted;

-- Create comprehensive policy for items_attempted
CREATE POLICY "items_attempted: for own attempts"
ON public.items_attempted
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.attempts a
    WHERE a.id = items_attempted.attempt_id
      AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.attempts a
    WHERE a.id = items_attempted.attempt_id
      AND a.user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.items_attempted TO authenticated;