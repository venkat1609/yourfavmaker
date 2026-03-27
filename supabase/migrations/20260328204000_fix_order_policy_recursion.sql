CREATE OR REPLACE FUNCTION public.is_order_owner(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = _order_id
      AND o.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_store_owner_product(_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.sellers s ON s.id = p.seller_id
    WHERE p.id = _product_id
      AND s.user_id = auth.uid()
      AND s.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.order_contains_store_product(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    JOIN public.sellers s ON s.id = p.seller_id
    WHERE oi.order_id = _order_id
      AND s.user_id = auth.uid()
      AND s.status = 'approved'
  );
$$;

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Sellers and admins can view store order items" ON public.order_items;
DROP POLICY IF EXISTS "Sellers and admins can view store orders" ON public.orders;

CREATE POLICY "Users can view own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (public.is_order_owner(order_id));

CREATE POLICY "Sellers and admins can view store order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_store_owner_product(product_id)
);

CREATE POLICY "Sellers and admins can view store orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_order_owner(id)
  OR public.order_contains_store_product(id)
);
