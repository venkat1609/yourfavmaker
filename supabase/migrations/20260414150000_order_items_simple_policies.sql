-- Simplify order_items policies to the three required guards for admin/users.

BEGIN;

DROP POLICY IF EXISTS "Admin can manage all order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Sellers and admins can view store order items" ON public.order_items;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all order items"
  ON public.order_items
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create own order items"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = public.order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = public.order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

COMMIT;
