BEGIN;

ALTER TABLE public.stores
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS address_street,
  DROP COLUMN IF EXISTS address_city,
  DROP COLUMN IF EXISTS address_state,
  DROP COLUMN IF EXISTS address_zip,
  DROP COLUMN IF EXISTS address_country,
  DROP COLUMN IF EXISTS pickup_address_street,
  DROP COLUMN IF EXISTS pickup_address_city,
  DROP COLUMN IF EXISTS pickup_address_state,
  DROP COLUMN IF EXISTS pickup_address_zip,
  DROP COLUMN IF EXISTS pickup_address_country;

COMMIT;
