-- Remove slug columns and helper functions now that we rely solely on store/collection ids.
BEGIN;

DROP TRIGGER IF EXISTS stores_enforce_unique_name_and_slug ON public.stores;
DROP FUNCTION IF EXISTS public.enforce_unique_store_name_and_slug();

ALTER TABLE public.stores
  DROP COLUMN IF EXISTS slug;

ALTER TABLE public.collections
  DROP COLUMN IF EXISTS slug;

DROP FUNCTION IF EXISTS public.generate_collection_slug(uuid, text);

COMMIT;
