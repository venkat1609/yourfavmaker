-- Drop outdated policies tied to the old sellers table and recreate them for the stores table.
DROP POLICY IF EXISTS "Sellers can manage own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can manage own product attributes" ON public.product_attributes;
DROP POLICY IF EXISTS "Sellers can manage own product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Sellers can manage own collections" ON public.collections;
DROP POLICY IF EXISTS "Sellers and admins can view store order items" ON public.order_items;
DROP POLICY IF EXISTS "Sellers and admins can view store orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers and admins can upload product images" ON storage.objects;

CREATE POLICY "Stores can manage own products"
ON public.products FOR ALL TO authenticated
USING (
  seller_id IN (
    SELECT id FROM public.stores
    WHERE user_id = auth.uid()
      AND status = 'approved'
  )
);

CREATE POLICY "Stores can manage own product attributes"
ON public.product_attributes FOR ALL TO authenticated
USING (
  product_id IN (
    SELECT id FROM public.products
    WHERE seller_id IN (
      SELECT id FROM public.stores
      WHERE user_id = auth.uid()
        AND status = 'approved'
    )
  )
);

CREATE POLICY "Stores can manage own product variants"
ON public.product_variants FOR ALL TO authenticated
USING (
  product_id IN (
    SELECT id FROM public.products
    WHERE seller_id IN (
      SELECT id FROM public.stores
      WHERE user_id = auth.uid()
        AND status = 'approved'
    )
  )
);

CREATE POLICY "Stores can manage own collections"
ON public.collections FOR ALL TO authenticated
USING (
  seller_id IN (
    SELECT id FROM public.stores
    WHERE user_id = auth.uid()
      AND status = 'approved'
  )
);

CREATE POLICY "Stores and admins can view order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.products
    JOIN public.stores ON public.stores.id = public.products.seller_id
    WHERE public.products.id = order_items.product_id
      AND public.stores.user_id = auth.uid()
      AND public.stores.status = 'approved'
  )
);

CREATE POLICY "Stores and admins can view orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.order_items
    JOIN public.products ON public.products.id = public.order_items.product_id
    JOIN public.stores ON public.stores.id = public.products.seller_id
    WHERE public.order_items.order_id = orders.id
      AND public.stores.user_id = auth.uid()
      AND public.stores.status = 'approved'
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
      FROM public.stores
      WHERE user_id = auth.uid()
        AND status = 'approved'
    )
  )
);

-- Recreate the uniqueness guard for store names/slugs.
DROP TRIGGER IF EXISTS sellers_enforce_unique_name_and_slug ON public.stores;
DROP FUNCTION IF EXISTS public.enforce_unique_seller_name_and_slug();

CREATE OR REPLACE FUNCTION public.enforce_unique_store_name_and_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.slug := lower(trim(NEW.slug));

  IF EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE lower(trim(s.name)) = lower(trim(NEW.name))
      AND s.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Store name already exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE lower(trim(s.slug)) = lower(trim(NEW.slug))
      AND s.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Store slug already exists';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stores_enforce_unique_name_and_slug ON public.stores;

CREATE TRIGGER stores_enforce_unique_name_and_slug
BEFORE INSERT OR UPDATE ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.enforce_unique_store_name_and_slug();
