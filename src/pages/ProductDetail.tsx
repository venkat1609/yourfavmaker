import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, ArrowLeft } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

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
  }, [attributes]);

  // Find matching variant based on selected options
  const selectedVariant = useMemo(() => {
    if (variants.length === 0) return null;
    return variants.find(v => {
      const opts = v.options as Record<string, string>;
      return Object.entries(selectedOptions).every(([key, val]) => opts[key] === val);
    }) || null;
  }, [variants, selectedOptions]);

  const displayPrice = selectedVariant ? Number(selectedVariant.price) : Number(product?.price || 0);
  const displayCompareAt = selectedVariant?.compare_at_price ? Number(selectedVariant.compare_at_price) : (product?.compare_at_price ? Number(product.compare_at_price) : null);
  const displayStock = selectedVariant ? selectedVariant.stock : (product?.stock || 0);
  const hasVariants = variants.length > 0;

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

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Please sign in to add items to your cart');
      navigate('/auth');
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
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="aspect-square overflow-hidden bg-secondary rounded-sm">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">No image</div>
          )}
        </div>

        <div className="flex flex-col justify-center space-y-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{product.category || 'General'}</p>
            <h1 className="text-3xl font-heading">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-medium">${displayPrice.toFixed(2)}</span>
            {displayCompareAt && (
              <span className="text-lg text-muted-foreground line-through">${displayCompareAt.toFixed(2)}</span>
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

          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-sm">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:bg-secondary transition-colors">
                <Minus className="h-4 w-4" />
              </button>
              <span className="px-4 text-sm font-medium">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:bg-secondary transition-colors">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={handleAddToCart} className="flex-1" disabled={displayStock === 0 || (hasVariants && !selectedVariant)}>
              {displayStock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {displayStock > 0 ? `${displayStock} in stock` : 'Currently unavailable'}
          </p>
        </div>
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={className}>{children}</p>;
}
