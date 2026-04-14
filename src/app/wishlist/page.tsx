"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ProductCard from '@/components/ProductCard';
import { PaginationControls, usePagination } from '@/components/PaginationControls';
import { Button } from '@/components/ui/button';
import { Tables } from '@/integrations/supabase/types';

type WishlistWithProduct = {
  id: string;
  created_at: string;
  product: Tables<'products'>;
};

export default function WishlistPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data = [], isLoading } = useQuery<WishlistWithProduct[]>({
    queryKey: ['wishlist-products', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlists')
        .select('id, created_at, product:products(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || [])
        .filter((row): row is { id: string; created_at: string; product: Tables<'products'> } => Boolean(row.product))
        .map(row => ({ id: row.id, created_at: row.created_at, product: row.product }));
    },
  });

  const { totalPages, getPageItems } = usePagination(data, 12);
  const pageItems = getPageItems(page);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (!user) {
    return (
      <div className="container py-12 text-center space-y-4">
        <p className="text-lg font-medium">Sign in to view your wishlist</p>
        <Link href="/auth">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-12 space-y-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Wishlist</p>
        <h1 className="text-3xl font-heading">Saved items</h1>
        <p className="text-sm text-muted-foreground">{data.length} product{data.length === 1 ? '' : 's'} saved for later.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-sm bg-secondary/40 h-64" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="border rounded-sm p-6 text-center space-y-3">
          <p className="text-lg font-medium">Empty Wishlist</p>
          <p className="text-sm text-muted-foreground">You have no items in your wishlist. Start adding!</p>
          <Link href="/products" className="inline-flex">
            <Button variant="outline">Browse products</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map(item => (
              <ProductCard key={item.id} product={item.product} showAddToCart />
            ))}
          </div>
          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} className="mt-4" />
        </>
      )}
    </div>
  );
}
