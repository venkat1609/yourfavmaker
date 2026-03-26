ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS is_primary BOOLEAN;

UPDATE public.addresses
SET is_primary = COALESCE(is_primary, is_default, false);

WITH duplicate_primary_addresses AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.addresses
  WHERE is_primary
)
UPDATE public.addresses a
SET is_primary = false
FROM duplicate_primary_addresses d
WHERE a.id = d.id
  AND d.rn > 1;

WITH primary_candidates AS (
  SELECT DISTINCT ON (user_id)
    id,
    user_id
  FROM public.addresses
  ORDER BY user_id, is_primary DESC, created_at ASC, id ASC
)
UPDATE public.addresses a
SET is_primary = true
FROM primary_candidates p
WHERE a.id = p.id
  AND NOT EXISTS (
    SELECT 1
    FROM public.addresses existing
    WHERE existing.user_id = a.user_id
      AND existing.is_primary
  );

ALTER TABLE public.addresses ALTER COLUMN is_primary SET DEFAULT false;
UPDATE public.addresses SET is_primary = false WHERE is_primary IS NULL;
ALTER TABLE public.addresses ALTER COLUMN is_primary SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS addresses_user_primary_idx
  ON public.addresses (user_id)
  WHERE is_primary;

CREATE OR REPLACE FUNCTION public.sync_primary_address_before_write()
RETURNS TRIGGER AS $$
DECLARE
  primary_exists boolean;
BEGIN
  IF current_setting('app.sync_primary_address', true) = 'on' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.addresses
    WHERE user_id = NEW.user_id
      AND is_primary
  ) INTO primary_exists;

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_primary OR NOT primary_exists THEN
      NEW.is_primary := true;
      PERFORM set_config('app.sync_primary_address', 'on', true);
      UPDATE public.addresses
      SET is_primary = false
      WHERE user_id = NEW.user_id
        AND (NEW.id IS NULL OR id <> NEW.id);
      PERFORM set_config('app.sync_primary_address', 'off', true);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_primary THEN
      PERFORM set_config('app.sync_primary_address', 'on', true);
      UPDATE public.addresses
      SET is_primary = false
      WHERE user_id = NEW.user_id
        AND (NEW.id IS NULL OR id <> NEW.id);
      PERFORM set_config('app.sync_primary_address', 'off', true);
    ELSIF OLD.is_primary AND NOT EXISTS (
      SELECT 1
      FROM public.addresses
      WHERE user_id = NEW.user_id
        AND is_primary
        AND id <> NEW.id
    ) THEN
      NEW.is_primary := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_primary_address_trigger ON public.addresses;
CREATE TRIGGER sync_primary_address_trigger
  BEFORE INSERT OR UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_primary_address_before_write();

CREATE OR REPLACE FUNCTION public.sync_primary_address_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.sync_primary_address', true) = 'on' THEN
    RETURN OLD;
  END IF;

  IF OLD.is_primary THEN
    PERFORM set_config('app.sync_primary_address', 'on', true);
    UPDATE public.addresses
    SET is_primary = true
    WHERE id = (
      SELECT id
      FROM public.addresses
      WHERE user_id = OLD.user_id
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    );
    PERFORM set_config('app.sync_primary_address', 'off', true);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_primary_address_after_delete_trigger ON public.addresses;
CREATE TRIGGER sync_primary_address_after_delete_trigger
  AFTER DELETE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_primary_address_after_delete();
