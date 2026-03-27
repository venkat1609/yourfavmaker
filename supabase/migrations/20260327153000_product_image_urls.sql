ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_urls text[];

UPDATE public.products
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL
  AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL OR array_length(image_urls, 1) = 0);
