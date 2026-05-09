
-- Products cache table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_id bigint UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  short_description text DEFAULT '',
  price numeric DEFAULT 0,
  sku text DEFAULT '',
  image_url text DEFAULT '',
  permalink text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_name ON public.products USING gin (to_tsvector('simple', name));
CREATE INDEX idx_products_name_trgm ON public.products (lower(name));
CREATE INDEX idx_products_sku ON public.products (sku);
CREATE INDEX idx_products_active ON public.products (active);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active products"
  ON public.products FOR SELECT
  TO authenticated
  USING (active = true);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for rep-uploaded line item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-images', 'quote-images', true);

CREATE POLICY "Public read quote images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quote-images');

CREATE POLICY "Authenticated users can upload quote images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'quote-images');

CREATE POLICY "Users can update their own quote images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'quote-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own quote images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'quote-images' AND auth.uid()::text = (storage.foldername(name))[1]);
