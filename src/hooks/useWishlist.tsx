"use client";

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type WishlistRow = Database['public']['Tables']['wishlists']['Row'];

export function useWishlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const wishlistKey = ['wishlist', user?.id];

  const { data = [], isLoading } = useQuery<WishlistRow[]>({
    queryKey: wishlistKey,
    enabled: Boolean(user),
    placeholderData: [],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('wishlists')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data as WishlistRow[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Must be logged in to save favorites');
      const { error } = await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: productId,
      });
      if (error) {
        if (error.code === '23505') return;
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Must be logged in to modify favorites');
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKey });
    },
  });

  const productIds = useMemo(() => new Set(data.map((item) => item.product_id)), [data]);
  const isInWishlist = useCallback((productId: string) => productIds.has(productId), [productIds]);

  return {
    wishlist: user ? data : [],
    isLoading,
    isInWishlist,
    addToWishlist: useCallback((productId: string) => addMutation.mutateAsync(productId), [addMutation]),
    removeFromWishlist: useCallback((productId: string) => removeMutation.mutateAsync(productId), [removeMutation]),
    isUpdating: addMutation.isLoading || removeMutation.isLoading,
  };
}
