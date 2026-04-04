-- Separate store payment details into their own table.
BEGIN;

CREATE TABLE IF NOT EXISTS public.store_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  bank_name text,
  bank_account_number text,
  bank_ifsc text,
  tax_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id)
);
ALTER TABLE public.store_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage store payments"
  ON public.store_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Store owners can manage payment details"
  ON public.store_payments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores st
      WHERE st.id = public.store_payments.store_id
        AND st.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores st
      WHERE st.id = public.store_payments.store_id
        AND st.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_store_payments_updated_at
BEFORE UPDATE ON public.store_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.store_payments (store_id, bank_name, bank_account_number, bank_ifsc, tax_id, created_at, updated_at)
SELECT id,
  bank_name,
  bank_account_number,
  bank_ifsc,
  tax_id,
  now(),
  now()
FROM public.stores
WHERE bank_name IS NOT NULL
   OR bank_account_number IS NOT NULL
   OR bank_ifsc IS NOT NULL
   OR tax_id IS NOT NULL;

ALTER TABLE public.stores
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_ifsc,
  DROP COLUMN IF EXISTS tax_id;

COMMIT;
