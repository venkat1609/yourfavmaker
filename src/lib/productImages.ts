import { supabase } from '@/integrations/supabase/client';

const PRODUCT_IMAGES_BUCKET = 'product-images';

export type ProductImageItem = {
  id: string;
  kind: 'existing' | 'new';
  previewUrl: string;
  file?: File;
};

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index) : '';
}

function buildImagePath(file: File) {
  return `products/${crypto.randomUUID()}${getFileExtension(file.name)}`;
}

export async function uploadProductImages(files: File[]) {
  const uploads = await Promise.all(
    files.map(async (file) => {
      const path = buildImagePath(file);
      const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

      if (error) throw error;

      const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }),
  );

  return uploads;
}

export function createProductImageItemsFromFiles(files: File[]) {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    kind: 'new' as const,
    previewUrl: URL.createObjectURL(file),
    file,
  }));
}

export function revokeProductImageItems(items: ProductImageItem[]) {
  items.forEach((item) => {
    if (item.kind === 'new') {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
}

export function reorderProductImageItems(items: ProductImageItem[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export async function resolveProductImageUrls(items: ProductImageItem[]) {
  const newFiles = items
    .filter((item): item is ProductImageItem & { file: File } => item.kind === 'new' && !!item.file)
    .map((item) => item.file);

  const uploadedUrls = newFiles.length > 0 ? await uploadProductImages(newFiles) : [];
  let uploadedIndex = 0;

  return items.map((item) => {
    if (item.kind === 'existing') return item.previewUrl;
    const url = uploadedUrls[uploadedIndex];
    uploadedIndex += 1;
    return url;
  });
}
