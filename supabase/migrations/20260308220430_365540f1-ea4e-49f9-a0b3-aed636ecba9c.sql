
-- Product attributes (e.g., "Color", "Size", "Material")
CREATE TABLE public.product_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  values text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Product variants (combinations of attributes with own pricing/stock)
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  price numeric NOT NULL,
  compare_at_price numeric,
  stock integer NOT NULL DEFAULT 0,
  options jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for product_attributes
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product attributes"
ON public.product_attributes FOR SELECT
USING (true);

CREATE POLICY "Admins can manage product attributes"
ON public.product_attributes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS for product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active variants"
ON public.product_variants FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage product variants"
ON public.product_variants FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add variant_id to cart_items (nullable for backward compat)
ALTER TABLE public.cart_items ADD COLUMN variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;

-- Add variant info to order_items
ALTER TABLE public.order_items ADD COLUMN variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN variant_name text;
ALTER TABLE public.order_items ADD COLUMN variant_options jsonb;
