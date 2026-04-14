BEGIN;

CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wishlist" ON public.wishlists;
CREATE POLICY "Users can view own wishlist"
  ON public.wishlists FOR SELECT USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can add to own wishlist" ON public.wishlists;
CREATE POLICY "Users can add to own wishlist"
  ON public.wishlists FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can remove own wishlist items" ON public.wishlists;
CREATE POLICY "Users can remove own wishlist items"
  ON public.wishlists FOR DELETE USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Admins can manage wishlist" ON public.wishlists;
CREATE POLICY "Admins can manage wishlist"
  ON public.wishlists FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

COMMIT;
