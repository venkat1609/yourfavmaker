BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS hidden_by_admin BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (
  is_active = true
  AND hidden_by_admin = false
);

COMMIT;
