import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    stock: number;
  };
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addToCart: (productId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
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
        .select('id, product_id, quantity, products(id, name, price, image_url, stock)')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        product: item.products,
      }));
    },
    enabled: !!user,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cart'] });

  const addMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      if (!user) throw new Error('Must be logged in');
      const { error } = await supabase.from('cart_items').upsert(
        { user_id: user.id, product_id: productId, quantity },
        { onConflict: 'user_id,product_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Added to cart'); },
    onError: () => toast.error('Failed to add to cart'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      if (!user) return;
      if (quantity <= 0) {
        await supabase.from('cart_items').delete().eq('user_id', user.id).eq('product_id', productId);
      } else {
        await supabase.from('cart_items').update({ quantity }).eq('user_id', user.id).eq('product_id', productId);
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

  const total = items.reduce((sum: number, item: CartItem) => sum + item.product.price * item.quantity, 0);
  const itemCount = items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        loading: isLoading,
        addToCart: (productId, quantity = 1) => {
          const existing = items.find((i: CartItem) => i.product_id === productId);
          addMutation.mutate({ productId, quantity: (existing?.quantity || 0) + quantity });
        },
        updateQuantity: (productId, quantity) => updateMutation.mutate({ productId, quantity }),
        removeFromCart: (productId) => updateMutation.mutate({ productId, quantity: 0 }),
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
