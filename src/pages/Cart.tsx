import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

function useRazorpayScript() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      setLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
  }, []);
  return loaded;
}

export default function Cart() {
  const { items, total, updateQuantity, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [placing, setPlacing] = useState(false);
  const razorpayLoaded = useRazorpayScript();

  const placeOrder = async () => {
    if (!user || items.length === 0 || !razorpayLoaded) return;
    setPlacing(true);
    try {
      // Create Razorpay order via edge function
      const { data, error } = await supabase.functions.invoke('razorpay-order', {
        body: { action: 'create' },
      });

      if (error || !data?.razorpay_order_id) {
        throw new Error(error?.message || data?.error || 'Failed to create order');
      }

      // Open Razorpay checkout
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'Maison',
        description: 'Order Payment',
        order_id: data.razorpay_order_id,
        prefill: data.prefill,
        theme: { color: '#1a1a1a' },
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-order', {
              body: {
                action: 'verify',
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: data.order_id,
              },
            });

            if (verifyError || !verifyData?.success) {
              throw new Error('Payment verification failed');
            }

            queryClient.invalidateQueries({ queryKey: ['cart'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('Payment successful! Order confirmed.');
            navigate('/orders');
          } catch (err: any) {
            toast.error(err.message || 'Payment verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            setPlacing(false);
            toast.info('Payment cancelled');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast.error(response.error?.description || 'Payment failed');
        setPlacing(false);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate payment');
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center animate-fade-in">
        <h1 className="text-3xl font-heading mb-4">Your Cart</h1>
        <p className="text-muted-foreground mb-6">Your cart is empty</p>
        <Link to="/"><Button variant="outline">Continue Shopping</Button></Link>
      </div>
    );
  }

  return (
    <div className="container py-12 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-3xl font-heading mb-8">Your Cart</h1>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          {items.map(item => {
            const price = item.variant ? item.variant.price : item.product.price;
            return (
              <div key={item.id} className="flex gap-4 pb-6 border-b">
                <div className="h-24 w-20 bg-secondary rounded-sm overflow-hidden flex-shrink-0">
                  {item.product.image_url ? (
                    <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No img</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.product_id}`} className="text-sm font-medium hover:underline">{item.product.name}</Link>
                  {item.variant && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.variant.name}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">₹{Number(price).toFixed(2)}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center border rounded-sm">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-secondary"><Minus className="h-3 w-3" /></button>
                      <span className="px-3 text-xs">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-secondary"><Plus className="h-3 w-3" /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className="text-sm font-medium">₹{(price * item.quantity).toFixed(2)}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-card p-6 rounded-sm border h-fit space-y-4">
          <h2 className="font-heading text-lg">Order Summary</h2>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>Free</span>
          </div>
          <div className="border-t pt-4 flex justify-between font-medium">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
          <Button className="w-full" onClick={placeOrder} disabled={placing || !razorpayLoaded}>
            {placing ? 'Processing...' : 'Pay with Razorpay'}
          </Button>
        </div>
      </div>
    </div>
  );
}
