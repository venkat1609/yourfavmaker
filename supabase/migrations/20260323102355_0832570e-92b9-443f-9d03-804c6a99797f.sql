
-- Add seller to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seller';

-- Add detailed fields to sellers table
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS address_state text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS address_zip text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS address_country text DEFAULT 'IN';
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS bank_ifsc text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- RLS: Allow authenticated users to insert their own seller application
CREATE POLICY "Users can create own seller profile"
ON public.sellers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS: Sellers can update their own seller profile
CREATE POLICY "Sellers can update own profile"
ON public.sellers FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- RLS: Allow sellers to manage their own products
CREATE POLICY "Sellers can manage own products"
ON public.products FOR ALL TO authenticated
USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid() AND status = 'approved'));

-- RLS: Allow sellers to manage attributes of their own products
CREATE POLICY "Sellers can manage own product attributes"
ON public.product_attributes FOR ALL TO authenticated
USING (product_id IN (SELECT id FROM public.products WHERE seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())));

-- RLS: Allow sellers to manage variants of their own products
CREATE POLICY "Sellers can manage own product variants"
ON public.product_variants FOR ALL TO authenticated
USING (product_id IN (SELECT id FROM public.products WHERE seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())));
