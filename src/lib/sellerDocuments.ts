import { supabase } from '@/integrations/supabase/client';

const SELLER_DOCUMENTS_BUCKET = 'seller-documents';

export type SellerDocumentKind = 'cancelled-cheque' | 'gst-certificate' | 'authorized-signature';

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index) : '';
}

function buildDocumentPath(kind: SellerDocumentKind, storeSlug: string, file: File) {
  const normalizedSlug = storeSlug || 'store';
  return `stores/${normalizedSlug}/${kind}/${crypto.randomUUID()}${getFileExtension(file.name)}`;
}

export async function uploadSellerDocument({
  file,
  kind,
  storeId,
  storeSlug,
  userId,
}: {
  file: File;
  kind: SellerDocumentKind;
  storeId: string;
  storeSlug: string;
  userId: string;
}) {
  const path = buildDocumentPath(kind, storeId, file);
  const { error: uploadError } = await supabase.storage.from(SELLER_DOCUMENTS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
    metadata: {
      user_id: userId,
      store_id: storeId,
      document_type: kind,
    },
  });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(SELLER_DOCUMENTS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
