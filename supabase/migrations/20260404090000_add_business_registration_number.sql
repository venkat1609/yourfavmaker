-- Store business registration number for compliance.
BEGIN;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS business_registration_number text;

ALTER TABLE public.stores
  ALTER COLUMN business_registration_number SET DEFAULT NULL;

COMMIT;
