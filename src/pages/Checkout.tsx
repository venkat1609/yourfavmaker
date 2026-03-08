import { useState, useEffect } from 'react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus, Plus, Trash2, ArrowLeft, Check, ShoppingBag, MapPin, CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

interface ShippingForm {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
}

const STEPS = [
  { id: 1, label: 'Cart', icon: ShoppingBag },
  { id: 2, label: 'Shipping', icon: MapPin },
  { id: 3, label: 'Payment', icon: CreditCard },
];

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

export default function Checkout() {
  const { items, total, updateQuantity, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const razorpayLoaded = useRazorpayScript();

  const [step, setStep] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [shipping, setShipping] = useState<ShippingForm>({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [errors, setErrors] = useState<Partial<ShippingForm>>({});

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && step > 1) {
      setStep(1);
    }
  }, [items.length, step]);

  const validateShipping = (): boolean => {
    const newErrors: Partial<ShippingForm> = {};

    if (!shipping.fullName.trim() || shipping.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name is required (min 2 characters)';
    }
    if (!shipping.phone.trim() || !/^[6-9]\d{9}$/.test(shipping.phone.trim())) {
      newErrors.phone = 'Valid 10-digit Indian mobile number required';
    }
    if (!shipping.street.trim() || shipping.street.trim().length < 5) {
      newErrors.street = 'Complete address is required (min 5 characters)';
    }
    if (!shipping.city.trim() || shipping.city.trim().length < 2) {
      newErrors.city = 'City is required';
    }
    if (!shipping.state) {
      newErrors.state = 'State is required';
    }
    if (!shipping.pincode.trim() || !/^\d{6}$/.test(shipping.pincode.trim())) {
      newErrors.pincode = 'Valid 6-digit pincode required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleShippingSubmit = () => {
    if (validateShipping()) {
      setStep(3);
    }
  };

  const handlePayment = async () => {
    if (!user || items.length === 0 || !razorpayLoaded) return;
    setPlacing(true);
    try {
      const { data, error } = await supabase.functions.invoke('razorpay-order', {
        body: {
          action: 'create',
          shipping_address: {
            full_name: shipping.fullName.trim(),
            phone: shipping.phone.trim(),
            street: shipping.street.trim(),
            city: shipping.city.trim(),
            state: shipping.state,
            pincode: shipping.pincode.trim(),
            country: 'India',
          },
        },
      });

      if (error || !data?.razorpay_order_id) {
        throw new Error(error?.message || data?.error || 'Failed to create order');
      }

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'Maison',
        description: 'Order Payment',
        order_id: data.razorpay_order_id,
        prefill: {
          ...data.prefill,
          name: shipping.fullName,
          contact: shipping.phone,
        },
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

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isActive = step === s.id;
        const isCompleted = step > s.id;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isCompleted
                    ? 'bg-accent text-accent-foreground'
                    : isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs mt-1.5 ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-16 sm:w-24 h-px mx-2 mb-5 ${isCompleted ? 'bg-accent' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  // Empty cart view
  if (items.length === 0 && step === 1) {
    return (
      <div className="container py-20 text-center animate-fade-in">
        <h1 className="text-3xl font-heading mb-4">Checkout</h1>
        <p className="text-muted-foreground mb-6">Your cart is empty</p>
        <Link to="/shop"><Button variant="outline">Continue Shopping</Button></Link>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-12 animate-fade-in">
      <button
        onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {step > 1 ? 'Back' : 'Continue Shopping'}
      </button>

      <h1 className="text-3xl font-heading mb-2">Checkout</h1>
      <StepIndicator />

      {/* Step 1: Cart Review */}
      {step === 1 && (
        <div className="space-y-8">
          <div className="space-y-4">
            {items.map(item => {
              const price = item.variant ? item.variant.price : item.product.price;
              return (
                <div key={item.id} className="flex gap-4 pb-4 border-b">
                  <div className="h-20 w-16 bg-secondary rounded-sm overflow-hidden flex-shrink-0">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No img</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.product_id}`} className="text-sm font-medium hover:underline">
                      {item.product.name}
                    </Link>
                    {item.variant && <p className="text-xs text-muted-foreground mt-0.5">{item.variant.name}</p>}
                    <p className="text-sm text-muted-foreground mt-1">₹{Number(price).toFixed(2)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border rounded-sm">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-secondary">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 text-xs">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-secondary">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium whitespace-nowrap">₹{(price * item.quantity).toFixed(2)}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-card border rounded-sm p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>Free</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-medium">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          <Button className="w-full" onClick={() => setStep(2)} disabled={items.length === 0}>
            Continue to Shipping
          </Button>
        </div>
      )}

      {/* Step 2: Shipping Details (India only) */}
      {step === 2 && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">We currently deliver only within India 🇮🇳</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={shipping.fullName}
                maxLength={100}
                onChange={e => setShipping(s => ({ ...s, fullName: e.target.value }))}
              />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="phone">Mobile Number</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 rounded-l-md bg-secondary text-sm text-muted-foreground">
                  +91
                </span>
                <Input
                  id="phone"
                  className="rounded-l-none"
                  placeholder="10-digit mobile number"
                  value={shipping.phone}
                  maxLength={10}
                  onChange={e => setShipping(s => ({ ...s, phone: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="street">Address</Label>
              <Input
                id="street"
                placeholder="House no, building, street, area"
                value={shipping.street}
                maxLength={200}
                onChange={e => setShipping(s => ({ ...s, street: e.target.value }))}
              />
              {errors.street && <p className="text-xs text-destructive">{errors.street}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="City"
                value={shipping.city}
                maxLength={100}
                onChange={e => setShipping(s => ({ ...s, city: e.target.value }))}
              />
              {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                placeholder="6-digit pincode"
                value={shipping.pincode}
                maxLength={6}
                onChange={e => setShipping(s => ({ ...s, pincode: e.target.value.replace(/\D/g, '') }))}
              />
              {errors.pincode && <p className="text-xs text-destructive">{errors.pincode}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>State / Union Territory</Label>
              <Select value={shipping.state} onValueChange={val => setShipping(s => ({ ...s, state: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map(st => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
            </div>
          </div>

          <Button className="w-full" onClick={handleShippingSubmit}>
            Continue to Payment
          </Button>
        </div>
      )}

      {/* Step 3: Payment Summary & Pay */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Shipping summary */}
          <div className="bg-card border rounded-sm p-5 space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-heading text-base">Shipping Address</h3>
              <button onClick={() => setStep(2)} className="text-xs text-accent hover:underline">Edit</button>
            </div>
            <p className="text-sm">{shipping.fullName}</p>
            <p className="text-sm text-muted-foreground">
              {shipping.street}, {shipping.city}, {shipping.state} — {shipping.pincode}
            </p>
            <p className="text-sm text-muted-foreground">+91 {shipping.phone}</p>
          </div>

          {/* Order summary */}
          <div className="bg-card border rounded-sm p-5 space-y-3">
            <h3 className="font-heading text-base">Order Summary</h3>
            {items.map(item => {
              const price = item.variant ? item.variant.price : item.product.price;
              return (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.product.name}{item.variant ? ` (${item.variant.name})` : ''} × {item.quantity}
                  </span>
                  <span>₹{(price * item.quantity).toFixed(2)}</span>
                </div>
              );
            })}
            <div className="border-t pt-3 flex justify-between font-medium">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          <Button className="w-full" onClick={handlePayment} disabled={placing || !razorpayLoaded}>
            {placing ? 'Processing...' : `Pay ₹${total.toFixed(2)} with Razorpay`}
          </Button>
        </div>
      )}
    </div>
  );
}
