"use client";

import type { MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  product: Tables<'products'>;
  showAddToCart?: boolean;
}

export default function ProductCard({ product, showAddToCart }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist, isUpdating: wishlistUpdating } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  const handleAddToCart = () => {
    if (product.stock <= 0) return;
    addToCart(product.id);
  };

  const handleWishlistToggle = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      toast.error('Sign in to save favorites');
      router.push('/auth');
      return;
    }
    try {
      if (isWishlisted) {
        await removeFromWishlist(product.id);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(product.id);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update wishlist');
    }
  };

  return (
    <div className="group relative flex flex-col animate-fade-in">
      <div className="relative">
        <button
          type="button"
          aria-pressed={isWishlisted}
          disabled={wishlistUpdating}
          onClick={handleWishlistToggle}
          className={cn(
            'absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground shadow transition hover:border-foreground hover:text-destructive',
            isWishlisted && 'border-destructive text-destructive'
          )}
        >
          <Heart className="h-4 w-4" />
        </button>
        <Link href={`/products/${product.id}`} className="block">
          <div className="aspect-[3/4] overflow-hidden bg-secondary rounded-sm mb-3">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                No image
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{product.category || 'General'}</p>
            <h3 className="text-sm font-medium leading-tight">{product.name}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">₹{Number(product.price).toFixed(2)}</span>
              {product.compare_at_price && (
                <span className="text-xs text-muted-foreground line-through">
                  ₹{Number(product.compare_at_price).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>
      {showAddToCart && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={handleAddToCart}
          disabled={product.stock <= 0}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {product.stock <= 0 ? 'Out of stock' : 'Add to cart'}
        </Button>
      )}
    </div>
  );
}
