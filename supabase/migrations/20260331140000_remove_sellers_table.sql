-- Remove the separate seller table so storefronts are the single source of seller data.
BEGIN;

-- Remove indexes that referenced the now-removed sellers table.
DROP INDEX IF EXISTS idx_sellers_default_store_id;

-- Rebuild the policies so they rely solely on the stores table and not the dropped sellers table.
DROP POLICY IF EXISTS "Stores can manage own products" ON public.products;
DROP POLICY IF EXISTS "Stores can manage own product attributes" ON public.product_attributes;
DROP POLICY IF EXISTS "Stores can manage own product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Stores can manage own collections" ON public.collections;
DROP POLICY IF EXISTS "Stores and admins can view store order items" ON public.order_items;
DROP POLICY IF EXISTS "Stores and admins can view store orders" ON public.orders;
DROP POLICY IF EXISTS "Stores and admins can upload product images" ON storage.objects;

-- Drop the fk column that linked stores to the seller table.
ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_seller_id_fkey;
ALTER TABLE public.stores
  DROP COLUMN IF EXISTS seller_id;

CREATE POLICY "Stores can manage own products"
ON public.products FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores st
    WHERE st.id = public.products.seller_id
      AND st.user_id = auth.uid()
      AND st.status = 'approved'
  )
);

CREATE POLICY "Stores can manage own product attributes"
ON public.product_attributes FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.stores st ON st.id = p.seller_id
    WHERE p.id = public.product_attributes.product_id
      AND st.user_id = auth.uid()
      AND st.status = 'approved'
  )
);

CREATE POLICY "Stores can manage own product variants"
ON public.product_variants FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.stores st ON st.id = p.seller_id
    WHERE p.id = public.product_variants.product_id
      AND st.user_id = auth.uid()
      AND st.status = 'approved'
  )
);

CREATE POLICY "Stores can manage own collections"
ON public.collections FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores st
    WHERE st.id = public.collections.seller_id
      AND st.user_id = auth.uid()
      AND st.status = 'approved'
  )
);

CREATE POLICY "Stores and admins can view store order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.stores st ON st.id = p.seller_id
    WHERE p.id = public.order_items.product_id
      AND st.user_id = auth.uid()
      AND st.status = 'approved'
  )
);

CREATE POLICY "Stores and admins can view store orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    JOIN public.stores st ON st.id = p.seller_id
    WHERE oi.order_id = public.orders.id
      AND st.user_id = auth.uid()
      AND st.status = 'approved'
  )
);

CREATE POLICY "Stores and admins can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.stores st
      WHERE st.user_id = auth.uid()
        AND st.status = 'approved'
    )
  )
);

-- Drop the seller table now that all storefront data lives in public.stores.
DROP TABLE IF EXISTS public.sellers;

COMMIT;
