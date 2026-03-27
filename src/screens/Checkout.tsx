"use client";

import { useState, useEffect } from 'react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Minus, Plus, Trash2, ArrowLeft, Check, ShoppingBag, MapPin, CreditCard, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    [key: string]: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void | Promise<void>;
  modal: {
    ondismiss: () => void;
  };
}

interface RazorpayInstance {
  on: (event: 'payment.failed', callback: (response: { error?: { description?: string } }) => void) => void;
  open: () => void;
}

interface ShippingForm {
  fullName: string;
  phone: string;
  label: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
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

interface SavedAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  is_primary: boolean;
}

export default function Checkout() {
  const { items, total, updateQuantity, removeFromCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const razorpayLoaded = useRazorpayScript();

  const [step, setStep] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [addressMode, setAddressMode] = useState<'saved' | 'new'>('saved');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [shipping, setShipping] = useState<ShippingForm>({
    fullName: '',
    phone: '',
    label: 'Home',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });
  const [saveAsPrimary, setSaveAsPrimary] = useState(false);
  const [errors, setErrors] = useState<Partial<ShippingForm>>({});

  // Fetch saved addresses
  const { data: savedAddresses = [], isLoading: loadingAddresses } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data as SavedAddress[];
    },
    enabled: !!user,
  });

  // Auto-select the primary address, or fall back to the first saved address
  useEffect(() => {
    if (savedAddresses.length === 0) {
      setAddressMode('new');
      setSelectedAddressId(null);
      return;
    }

    if (addressMode === 'new') {
      return;
    }

    const selectedExists = selectedAddressId ? savedAddresses.some(a => a.id === selectedAddressId) : false;

    if (!selectedAddressId || !selectedExists) {
      const primaryAddr = savedAddresses.find(a => a.is_primary) || savedAddresses[0];
      setSelectedAddressId(primaryAddr.id);
      setAddressMode('saved');
    }
  }, [savedAddresses, selectedAddressId, addressMode]);

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
    if (!shipping.label.trim()) {
      newErrors.label = 'Label is required';
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
    if (!shipping.country.trim()) {
      newErrors.country = 'Country is required';
    }
    if (!shipping.pincode.trim() || !/^\d{6}$/.test(shipping.pincode.trim())) {
      newErrors.pincode = 'Valid 6-digit pincode required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getShippingAddress = () => {
    if (addressMode === 'saved' && selectedAddressId) {
      const addr = savedAddresses.find(a => a.id === selectedAddressId);
      if (addr) {
        return {
          full_name: shipping.fullName.trim() || addr.label,
          phone: shipping.phone.trim(),
          street: addr.street,
          city: addr.city,
          state: addr.state,
          pincode: addr.zip,
          country: 'India',
        };
      }
    }
    return {
      full_name: shipping.fullName.trim(),
      phone: shipping.phone.trim(),
      street: shipping.street.trim(),
      city: shipping.city.trim(),
      state: shipping.state,
      pincode: shipping.pincode.trim(),
      country: 'India',
    };
  };

  const handleShippingSubmit = async () => {
    if (addressMode === 'saved' && selectedAddressId) {
      // For saved address, only validate name & phone
      const newErrors: Partial<ShippingForm> = {};
      if (!shipping.fullName.trim() || shipping.fullName.trim().length < 2) {
        newErrors.fullName = 'Full name is required (min 2 characters)';
      }
      if (!shipping.phone.trim() || !/^[6-9]\d{9}$/.test(shipping.phone.trim())) {
        newErrors.phone = 'Valid 10-digit Indian mobile number required';
      }
      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) return;
      setStep(3);
    } else {
      if (!validateShipping()) return;

      // Save new address for future use
      if (user) {
        try {
          const { error } = await supabase.from('addresses').insert({
            user_id: user.id,
            street: shipping.street.trim(),
            city: shipping.city.trim(),
            state: shipping.state,
            zip: shipping.pincode.trim(),
            country: shipping.country.trim() || 'India',
            label: shipping.label.trim(),
            is_primary: saveAsPrimary || savedAddresses.length === 0,
          });
          if (!error) {
            queryClient.invalidateQueries({ queryKey: ['addresses'] });
            toast.success('Address saved for future use');
          }
        } catch {
          // Non-blocking: address save failed silently
        }
      }
      setStep(3);
    }
  };

  const handlePayment = async () => {
    if (!user || items.length === 0 || !razorpayLoaded) return;
    setPlacing(true);
    try {
      const shippingAddress = getShippingAddress();
      const { data, error } = await supabase.functions.invoke('razorpay-order', {
        body: {
          action: 'create',
          shipping_address: shippingAddress,
        },
      });

      if (error || !data?.razorpay_order_id) {
        throw new Error(error?.message || data?.error || 'Failed to create order');
      }

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'YourFavMaker',
        description: 'Order Payment',
        order_id: data.razorpay_order_id,
        prefill: {
          ...data.prefill,
          name: shipping.fullName,
          contact: shipping.phone,
        },
        theme: { color: '#1a1a1a' },
        handler: async (response: RazorpayResponse) => {
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
            router.push('/orders');
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Payment verification failed');
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
      rzp.on('payment.failed', (response) => {
        toast.error(response.error?.description || 'Payment failed');
        setPlacing(false);
      });
      rzp.open();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to initiate payment');
      setPlacing(false);
    }
  };

  const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId);

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
        <Link href="/products"><Button variant="outline">Continue Shopping</Button></Link>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-12 animate-fade-in">
      <button
        onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
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
                    <Link href={`/products/${item.product_id}`} className="text-sm font-medium hover:underline">
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

          {/* Name & Phone (always required) */}
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
          </div>

          {/* Address selection */}
          {savedAddresses.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-heading">Delivery Address</Label>
              <RadioGroup
                value={addressMode === 'saved' ? selectedAddressId || '' : 'new'}
                onValueChange={(val) => {
                  if (val === 'new') {
                    setAddressMode('new');
                    setSelectedAddressId(null);
                  } else {
                    setAddressMode('saved');
                    setSelectedAddressId(val);
                  }
                }}
                className="space-y-3"
              >
                {savedAddresses.map(addr => (
                  <label
                    key={addr.id}
                    className={`flex items-start gap-3 p-4 border rounded-sm cursor-pointer transition-colors ${
                      addressMode === 'saved' && selectedAddressId === addr.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <RadioGroupItem value={addr.id} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{addr.label}</span>
                        {addr.is_primary && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-accent text-accent-foreground rounded">Primary</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {addr.street}, {addr.city}, {addr.state} — {addr.zip}
                      </p>
                    </div>
                  </label>
                ))}

                <label
                  className={`flex items-center gap-3 p-4 border rounded-sm cursor-pointer transition-colors ${
                    addressMode === 'new'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <RadioGroupItem value="new" />
                  <PlusCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Add new address</span>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* New address form */}
          {addressMode === 'new' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  placeholder="Home, Office, etc."
                  value={shipping.label}
                  maxLength={50}
                  onChange={e => setShipping(s => ({ ...s, label: e.target.value }))}
                />
                {errors.label && <p className="text-xs text-destructive">{errors.label}</p>}
              </div>

              <div className="space-y-1.5">
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

              <div className="grid sm:grid-cols-2 gap-4">
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
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="state">State / Union Territory</Label>
                  <Input
                    id="state"
                    placeholder="State / Union Territory"
                    value={shipping.state}
                    maxLength={100}
                    onChange={e => setShipping(s => ({ ...s, state: e.target.value }))}
                  />
                  {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="Country"
                    value={shipping.country}
                    maxLength={100}
                    onChange={e => setShipping(s => ({ ...s, country: e.target.value }))}
                  />
                  {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-sm border p-3">
                <Checkbox
                  id="save-primary"
                  checked={saveAsPrimary}
                  onCheckedChange={checked => setSaveAsPrimary(checked === true)}
                />
                <Label htmlFor="save-primary" className="text-sm font-normal cursor-pointer">
                  Save as primary address
                </Label>
              </div>
            </div>
          )}

          <Button className="w-full" onClick={handleShippingSubmit} disabled={loadingAddresses}>
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
            {addressMode === 'saved' && selectedAddress ? (
              <p className="text-sm text-muted-foreground">
                {selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state} — {selectedAddress.zip}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {shipping.street}, {shipping.city}, {shipping.state} — {shipping.pincode}
              </p>
            )}
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
