CREATE OR REPLACE FUNCTION public.enforce_unique_seller_name_and_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.slug := lower(trim(NEW.slug));

  IF EXISTS (
    SELECT 1
    FROM public.sellers s
    WHERE lower(trim(s.name)) = lower(trim(NEW.name))
      AND s.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Store name already exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.sellers s
    WHERE lower(trim(s.slug)) = lower(trim(NEW.slug))
      AND s.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Store slug already exists';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sellers_enforce_unique_name_and_slug ON public.sellers;

CREATE TRIGGER sellers_enforce_unique_name_and_slug
BEFORE INSERT OR UPDATE ON public.sellers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_unique_seller_name_and_slug();
