"use client";

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Minus, Plus, ArrowLeft, Heart } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import SellerCard from '@/components/SellerCard';
import ProductCard from '@/components/ProductCard';
import type { Database } from '@/integrations/supabase/types';
import type { Tables } from '@/integrations/supabase/types';
import { useWishlist } from '@/hooks/useWishlist';

type ProductRow = Database['public']['Tables']['products']['Row'];
type SuggestedProduct = Tables<'products'>;

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as ProductRow;
    },
    enabled: !!id,
  });

  const { isInWishlist, addToWishlist, removeFromWishlist, isUpdating: wishlistLoading } = useWishlist();
  const { data: attributes = [] } = useQuery({
    queryKey: ['product-attributes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_attributes')
        .select('*')
        .eq('product_id', id!)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', id!)
        .eq('is_active', true)
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Initialize selected options with first value of each attribute
  useEffect(() => {
    if (attributes.length > 0 && Object.keys(selectedOptions).length === 0) {
      const initial: Record<string, string> = {};
      attributes.forEach(attr => {
        if (attr.values && attr.values.length > 0) {
          initial[attr.name] = attr.values[0];
        }
      });
      setSelectedOptions(initial);
    }
  }, [attributes, selectedOptions]);

  // Find matching variant based on selected options
  const selectedVariant = useMemo(() => {
    if (variants.length === 0) return null;
    return variants.find(v => {
      const opts = v.options as Record<string, string>;
      return Object.entries(selectedOptions).every(([key, val]) => opts[key] === val);
    }) || null;
  }, [variants, selectedOptions]);

  const { data: store } = useQuery({
    queryKey: ['product-store', product?.seller_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('stores').select('*').eq('id', product!.seller_id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!product?.seller_id,
  });

  const { data: suggestedProducts = [] } = useQuery({
    queryKey: ['product-suggestions', product?.id, product?.category, product?.seller_id],
    queryFn: async () => {
      if (!product) return [];

      const categoryQuery = product.category
        ? supabase
            .from('products')
            .select('*')
            .eq('category', product.category)
            .neq('id', product.id)
            .limit(8)
        : null;

      const sellerQuery = product.seller_id
        ? supabase
            .from('products')
            .select('*')
            .eq('seller_id', product.seller_id)
            .neq('id', product.id)
            .limit(8)
        : null;

      const queries = [categoryQuery, sellerQuery].filter(Boolean) as NonNullable<typeof categoryQuery>[];
      const results = await Promise.all(queries.map(async query => {
        const { data, error } = await query;
        if (error) throw error;
        return data as SuggestedProduct[];
      }));

      const merged = results.flat();
      const unique = new Map<string, SuggestedProduct>();
      merged.forEach(item => {
        if (!unique.has(item.id)) unique.set(item.id, item);
      });

      return Array.from(unique.values()).slice(0, 4);
    },
    enabled: !!product,
  });

  const displayPrice = selectedVariant ? Number(selectedVariant.price) : Number(product?.price || 0);
  const displayCompareAt = selectedVariant?.compare_at_price ? Number(selectedVariant.compare_at_price) : (product?.compare_at_price ? Number(product.compare_at_price) : null);
  const displayStock = selectedVariant ? selectedVariant.stock : (product?.stock || 0);
  const hasVariants = variants.length > 0;
  const productImages = useMemo(() => {
    if (!product) return [];
    const urls = (product.image_urls || []).filter(Boolean);
    if (urls.length > 0) return urls;
    return product.image_url ? [product.image_url] : [];
  }, [product]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product?.id]);

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="aspect-square bg-secondary rounded-sm animate-pulse" />
          <div className="space-y-4">
            <div className="h-6 bg-secondary rounded w-1/3 animate-pulse" />
            <div className="h-8 bg-secondary rounded w-2/3 animate-pulse" />
            <div className="h-20 bg-secondary rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const isWishlisted = product ? isInWishlist(product.id) : false;

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  const handleWishlistToggle = () => {
    if (!user) {
      toast.error('Please sign in to save favorites');
      router.push('/auth');
      return;
    }
    if (!product) return;
    if (isWishlisted) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product.id);
    }
  };

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Please sign in to add items to your cart');
      router.push('/auth');
      return;
    }
    if (hasVariants && !selectedVariant) {
      toast.error('Please select all options');
      return;
    }
    addToCart(product.id, quantity, selectedVariant?.id || undefined);
  };

  return (
    <div className="container py-12 animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-3">
          {productImages.length > 0 ? (
            <>
              <div className="aspect-square overflow-hidden bg-secondary rounded-sm">
                <img
                  src={productImages[selectedImageIndex] || productImages[0]}
                  alt={`${product.name} image ${selectedImageIndex + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              {productImages.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {productImages.map((imageUrl, index) => (
                    <button
                      key={`${imageUrl}-${index}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`aspect-square overflow-hidden rounded-sm border transition-all ${
                        selectedImageIndex === index
                          ? 'border-foreground ring-2 ring-foreground/20'
                          : 'border-border hover:border-foreground/40'
                      }`}
                      aria-label={`View product image ${index + 1}`}
                    >
                      <img
                        src={imageUrl}
                        alt={`${product.name} thumbnail ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-square overflow-hidden bg-secondary rounded-sm flex items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center space-y-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{product.category || 'General'}</p>
            <h1 className="text-3xl font-heading">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-medium">₹{displayPrice.toFixed(2)}</span>
            {displayCompareAt && (
              <span className="text-lg text-muted-foreground line-through">₹{displayCompareAt.toFixed(2)}</span>
            )}
          </div>

          {product.description && (
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          {/* Attribute selectors */}
          {attributes.length > 0 && (
            <div className="space-y-4">
              {attributes.map(attr => (
                <div key={attr.id} className="space-y-2">
                  <Label className="text-sm font-medium">{attr.name}</Label>
                  <div className="flex flex-wrap gap-2">
                    {(attr.values || []).map(val => {
                      const isSelected = selectedOptions[attr.name] === val;
                      // Check if this option is available in any variant
                      const isAvailable = variants.length === 0 || variants.some(v => {
                        const opts = v.options as Record<string, string>;
                        return opts[attr.name] === val;
                      });
                      return (
                        <button
                          key={val}
                          onClick={() => setSelectedOptions({ ...selectedOptions, [attr.name]: val })}
                          disabled={!isAvailable}
                          className={`px-4 py-2 text-sm border rounded-sm transition-colors ${
                            isSelected
                              ? 'border-foreground bg-foreground text-background'
                              : isAvailable
                                ? 'border-border hover:border-foreground'
                                : 'border-border opacity-40 cursor-not-allowed line-through'
                          }`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Variant info */}
          {hasVariants && selectedVariant && (
            <div className="flex items-center gap-2">
              {selectedVariant.sku && (
                <Badge variant="secondary" className="text-xs">SKU: {selectedVariant.sku}</Badge>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center border rounded-sm">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:bg-secondary transition-colors">
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-4 text-sm font-medium">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:bg-secondary transition-colors">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-1 min-w-[220px] items-center gap-3">
              <Button onClick={handleAddToCart} className="flex-1" disabled={displayStock === 0 || (hasVariants && !selectedVariant)}>
                {displayStock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <Button
                variant={isWishlisted ? 'secondary' : 'outline'}
                className="flex items-center gap-2 whitespace-nowrap"
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
              >
                <Heart className={`h-4 w-4 ${isWishlisted ? 'text-destructive' : ''}`} />
                {isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {displayStock > 0 ? `${displayStock} in stock` : 'Currently unavailable'}
          </p>

          {/* Seller info */}
          {store && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Sold by</p>
              <SellerCard seller={store} />
            </div>
          )}
        </div>
      </div>

      {suggestedProducts.length > 0 && (
        <section className="mt-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Recommended</p>
              <h2 className="text-2xl font-heading">You may also like</h2>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {suggestedProducts.map(productItem => (
              <ProductCard key={productItem.id} product={productItem} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
