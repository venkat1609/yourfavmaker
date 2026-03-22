
-- Create sellers table
CREATE TABLE public.sellers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  location text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Anyone can view sellers
CREATE POLICY "Anyone can view sellers" ON public.sellers FOR SELECT USING (true);

-- Admins can manage sellers
CREATE POLICY "Admins can manage sellers" ON public.sellers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Add seller_id to products
ALTER TABLE public.products ADD COLUMN seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;
