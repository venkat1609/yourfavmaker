-- Add slug column for stores and keep it unique per store to organize seller documents by slug.
BEGIN;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.normalize_store_slug(input text) RETURNS text AS $$
DECLARE
  base text := lower(coalesce(input, ''));
BEGIN
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' FROM base);
  IF base = '' THEN
    RETURN 'store';
  END IF;
  RETURN base;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.build_store_slug(p_name text, p_id uuid) RETURNS text AS $$
DECLARE
  normalized text := public.normalize_store_slug(p_name);
BEGIN
  RETURN normalized || '-' || substring(coalesce(p_id::text, gen_random_uuid()::text) FROM 1 FOR 8);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.ensure_store_slug() RETURNS trigger AS $$
BEGIN
  NEW.slug := public.build_store_slug(NEW.name, COALESCE(NEW.id, gen_random_uuid()));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stores_ensure_slug ON public.stores;

CREATE TRIGGER stores_ensure_slug
  BEFORE INSERT OR UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_store_slug();

UPDATE public.stores
SET slug = public.build_store_slug(name, id)
WHERE slug IS NULL OR slug = '';

ALTER TABLE public.stores
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_slug_unique ON public.stores (slug);

COMMIT;
