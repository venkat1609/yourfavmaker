-- Store collections for internal seller organization
CREATE TABLE public.collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, name),
  UNIQUE (seller_id, slug)
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Sellers can manage own collections"
ON public.collections
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR seller_id IN (
    SELECT id FROM public.sellers
    WHERE user_id = auth.uid() AND status = 'approved'
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR seller_id IN (
    SELECT id FROM public.sellers
    WHERE user_id = auth.uid() AND status = 'approved'
  )
);

CREATE OR REPLACE FUNCTION public.generate_collection_slug(_seller_id uuid, _name text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  base_slug text;
  candidate text;
  suffix integer := 1;
BEGIN
  base_slug := regexp_replace(lower(trim(_name)), '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
  candidate := base_slug;

  WHILE EXISTS (
    SELECT 1 FROM public.collections
    WHERE seller_id = _seller_id AND slug = candidate
  ) LOOP
    candidate := base_slug || '-' || suffix::text;
    suffix := suffix + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL;
