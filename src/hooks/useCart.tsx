import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    stock: number;
  };
  variant?: {
    id: string;
    name: string;
    price: number;
    stock: number;
    options: Record<string, string>;
  } | null;
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addToCart: (productId: string, quantity?: number, variantId?: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('cart_items')
        .select('id, product_id, variant_id, quantity, products(id, name, price, image_url, stock)')
        .eq('user_id', user.id);
      if (error) throw error;

      // Fetch variant data for items with variant_id
      const variantIds = (data || []).filter(i => i.variant_id).map(i => i.variant_id!);
      let variantMap = new Map();
      if (variantIds.length > 0) {
        const { data: variantsData } = await supabase
          .from('product_variants')
          .select('id, name, price, stock, options')
          .in('id', variantIds);
        if (variantsData) {
          variantsData.forEach(v => variantMap.set(v.id, v));
        }
      }

      return (data || []).map((item: any) => ({
        ...item,
        product: item.products,
        variant: item.variant_id ? variantMap.get(item.variant_id) || null : null,
      }));
    },
    enabled: !!user,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cart'] });

  const addMutation = useMutation({
    mutationFn: async ({ productId, quantity, variantId }: { productId: string; quantity: number; variantId?: string }) => {
      if (!user) throw new Error('Must be logged in');
      
      // Check for existing cart item with same product+variant
      let query = supabase.from('cart_items').select('id, quantity').eq('user_id', user.id).eq('product_id', productId);
      if (variantId) {
        query = query.eq('variant_id', variantId);
      } else {
        query = query.is('variant_id', null);
      }
      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const { error } = await supabase.from('cart_items')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const insertData: any = { user_id: user.id, product_id: productId, quantity };
        if (variantId) insertData.variant_id = variantId;
        const { error } = await supabase.from('cart_items').insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate(); toast.success('Added to cart'); },
    onError: () => toast.error('Failed to add to cart'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (!user) return;
      if (quantity <= 0) {
        await supabase.from('cart_items').delete().eq('id', itemId);
      } else {
        await supabase.from('cart_items').update({ quantity }).eq('id', itemId);
      }
    },
    onSuccess: invalidate,
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from('cart_items').delete().eq('user_id', user.id);
    },
    onSuccess: invalidate,
  });

  const total = items.reduce((sum: number, item: CartItem) => {
    const price = item.variant ? item.variant.price : item.product.price;
    return sum + price * item.quantity;
  }, 0);
  const itemCount = items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        loading: isLoading,
        addToCart: (productId, quantity = 1, variantId) => {
          addMutation.mutate({ productId, quantity, variantId });
        },
        updateQuantity: (itemId, quantity) => updateMutation.mutate({ itemId, quantity }),
        removeFromCart: (itemId) => updateMutation.mutate({ itemId, quantity: 0 }),
        clearCart: () => clearMutation.mutate(),
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
