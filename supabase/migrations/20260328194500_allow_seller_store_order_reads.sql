DROP POLICY IF EXISTS "Sellers and admins can view store order items" ON public.order_items;
DROP POLICY IF EXISTS "Sellers and admins can view store orders" ON public.orders;

CREATE POLICY "Sellers and admins can view store order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.products
    JOIN public.sellers ON public.sellers.id = public.products.seller_id
    WHERE public.products.id = order_items.product_id
      AND public.sellers.user_id = auth.uid()
      AND public.sellers.status = 'approved'
  )
);

CREATE POLICY "Sellers and admins can view store orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.order_items
    JOIN public.products ON public.products.id = public.order_items.product_id
    JOIN public.sellers ON public.sellers.id = public.products.seller_id
    WHERE public.order_items.order_id = orders.id
      AND public.sellers.user_id = auth.uid()
      AND public.sellers.status = 'approved'
  )
);
