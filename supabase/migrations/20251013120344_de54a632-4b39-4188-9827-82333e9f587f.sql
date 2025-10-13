-- Create quotations table to store all quotation data
CREATE TABLE public.quotations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  quotation_number text NOT NULL,
  date text NOT NULL,
  customer_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  sales_rep_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  project_title text NOT NULL DEFAULT '',
  intro_text text NOT NULL DEFAULT '',
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  installation_cost numeric NOT NULL DEFAULT 0,
  include_tax boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own quotations" 
ON public.quotations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quotations" 
ON public.quotations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotations" 
ON public.quotations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotations" 
ON public.quotations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_quotations_updated_at
BEFORE UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to delete old quotations
CREATE OR REPLACE FUNCTION public.delete_old_quotations()
RETURNS void AS $$
BEGIN
  DELETE FROM public.quotations
  WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create index for faster queries on user_id and created_at
CREATE INDEX idx_quotations_user_id ON public.quotations(user_id);
CREATE INDEX idx_quotations_created_at ON public.quotations(created_at);

-- Enable pg_cron extension for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup of old quotations (runs at midnight)
SELECT cron.schedule(
  'delete-old-quotations',
  '0 0 * * *',
  'SELECT public.delete_old_quotations();'
);