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
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const { data: seller, isLoading: sellerLoading } = useQuery({
    queryKey: ['seller', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('slug', slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['seller-products', seller?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', seller!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!seller?.id,
  });

  const { totalPages, getPageItems } = usePagination(products, ITEMS_PER_PAGE);
  const pageProducts = getPageItems(page);

  if (sellerLoading) {
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

  if (!seller) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Seller not found</p>
      </div>
    );
  }

  const initials = seller.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="container py-12 animate-fade-in">
      <Link href="/products" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>

      {/* Seller header */}
      <div className="flex items-start gap-6 mb-10 pb-8 border-b">
        <Avatar className="h-20 w-20 border">
          {seller.logo_url ? <AvatarImage src={seller.logo_url} alt={seller.name} /> : null}
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h1 className="text-2xl font-heading">{seller.name}</h1>
          {seller.location && (
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-sm">{seller.location}</span>
            </div>
          )}
          {seller.description && (
            <p className="text-sm text-muted-foreground mt-3 max-w-2xl leading-relaxed">{seller.description}</p>
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
