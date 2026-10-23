ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS project_details TEXT NOT NULL DEFAULT '';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;