-- Simplify orders policies so only admin, order owner, and store sellers can read orders.

BEGIN;

DROP POLICY IF EXISTS "Admin can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Stores and admins can view orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers and admins can view store orders" ON public.orders;

DROP FUNCTION IF EXISTS public.order_contains_store_product(uuid);
DROP FUNCTION IF EXISTS public.is_order_owner(uuid);

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

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all orders"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create own orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_order_owner(id));

COMMIT;
