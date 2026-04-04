-- Rename the existing sellers table (which currently holds storefront metadata)
-- into stores, so we can keep every storefront with its own row.
ALTER TABLE public.sellers RENAME TO stores;

-- Create a dedicated seller profile table that maps one user to one seller.
CREATE TABLE IF NOT EXISTS public.sellers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may insert their own seller profile.
CREATE POLICY "Users can create seller profile"
ON public.sellers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users may read their own seller profile.
CREATE POLICY "Users can read own seller profile"
ON public.sellers FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users may update their own seller profile.
CREATE POLICY "Users can update own seller profile"
ON public.sellers FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins manage seller profiles.
CREATE POLICY "Admins can manage seller profiles"
ON public.sellers FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Populate seller profiles from the existing storefront rows.
INSERT INTO public.sellers (user_id, status, created_at, updated_at)
SELECT user_id,
  CASE WHEN bool_or(status = 'approved') THEN 'approved' ELSE 'pending' END,
  MIN(created_at),
  MAX(updated_at)
FROM public.stores
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- Link existing stores to their seller profiles (new table)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id);

UPDATE public.stores
SET seller_id = s.id
FROM public.sellers s
WHERE public.stores.user_id = s.user_id
  AND public.stores.user_id IS NOT NULL;
