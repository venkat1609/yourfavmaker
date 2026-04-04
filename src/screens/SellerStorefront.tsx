"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, ArrowLeft } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { PaginationControls, usePagination } from '@/components/PaginationControls';
import { useState } from 'react';

export default function SellerStorefront() {
  const params = useParams<{ storeId: string }>();
  const storeId = params?.storeId;
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['seller', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['store-products', store?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', store!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  const { totalPages, getPageItems } = usePagination(products, ITEMS_PER_PAGE);
  const pageProducts = getPageItems(page);

  if (storeLoading) {
    return (
      <div className="container py-12">
        <div className="h-32 bg-secondary rounded-sm animate-pulse mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square bg-secondary rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Store not found</p>
      </div>
    );
  }

  const initials = store.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="container py-12 animate-fade-in">
      <Link href="/products" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      {/* Store header */}
      <div className="flex items-start gap-6 mb-10 pb-8 border-b">
        <Avatar className="h-20 w-20 border">
          {store.logo_url ? <AvatarImage src={store.logo_url} alt={store.name} /> : null}
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h1 className="text-2xl font-heading">{store.name}</h1>
          {store.location && (
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-sm">{store.location}</span>
            </div>
          )}
          {store.description && (
            <p className="text-sm text-muted-foreground mt-3 max-w-2xl leading-relaxed">{store.description}</p>
          )}
        </div>
      </div>

      {/* Products */}
      <h2 className="text-lg font-heading mb-6">Products ({products.length})</h2>

      {products.length === 0 ? (
        <p className="text-muted-foreground text-sm">No products yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pageProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} className="mt-8" />
        </>
      )}
    </div>
  );
}
