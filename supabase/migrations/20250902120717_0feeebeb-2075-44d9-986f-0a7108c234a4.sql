-- Create storage buckets for print functionality
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('print-artifacts', 'print-artifacts', false),
  ('print-uploads', 'print-uploads', false);

-- Create print packages table
CREATE TABLE IF NOT EXISTS public.print_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  paper_pdf_url text NOT NULL,
  omr_pdf_url text NOT NULL,
  qr_payload jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create print uploads table
CREATE TABLE IF NOT EXISTS public.print_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.attempts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'received',
  upload_urls jsonb NOT NULL,
  detected jsonb,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_print_packages_test ON public.print_packages(test_id DESC);
CREATE INDEX IF NOT EXISTS idx_print_uploads_test ON public.print_uploads(test_id DESC);
CREATE INDEX IF NOT EXISTS idx_print_uploads_user ON public.print_uploads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_print_uploads_status ON public.print_uploads(status);

-- Enable RLS
ALTER TABLE public.print_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies for print_packages
CREATE POLICY "pp_read" ON public.print_packages FOR SELECT
USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.tests t 
    WHERE t.id = test_id AND t.owner_id = auth.uid()
  )
);

CREATE POLICY "pp_write" ON public.print_packages FOR INSERT 
WITH CHECK (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.tests t 
    WHERE t.id = test_id AND t.owner_id = auth.uid()
  )
);

CREATE POLICY "pp_update" ON public.print_packages FOR UPDATE
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- RLS policies for print_uploads
CREATE POLICY "pu_user_ins" ON public.print_uploads FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pu_user_sel" ON public.print_uploads FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "pu_user_upd" ON public.print_uploads FOR UPDATE 
USING (auth.uid() = user_id OR public.is_admin()) 
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Create storage policies for print-artifacts bucket
CREATE POLICY "Allow reading print artifacts for test owners" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'print-artifacts' AND 
  (
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.tests t 
      WHERE t.id::text = split_part(name, '/', 1)
      AND t.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Allow uploading print artifacts for test owners" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'print-artifacts' AND 
  (
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.tests t 
      WHERE t.id::text = split_part(name, '/', 1)
      AND t.owner_id = auth.uid()
    )
  )
);

-- Create storage policies for print-uploads bucket  
CREATE POLICY "Allow reading own print uploads" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'print-uploads' AND 
  (
    auth.uid()::text = split_part(name, '/', 2) OR 
    public.is_admin()
  )
);

CREATE POLICY "Allow uploading own print uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'print-uploads' AND 
  auth.uid()::text = split_part(name, '/', 2)
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at() 
RETURNS trigger 
LANGUAGE plpgsql 
AS $$
BEGIN 
  NEW.updated_at := now(); 
  RETURN NEW; 
END 
$$;

DROP TRIGGER IF EXISTS trg_print_uploads_touch ON public.print_uploads;
CREATE TRIGGER trg_print_uploads_touch 
BEFORE UPDATE ON public.print_uploads
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();