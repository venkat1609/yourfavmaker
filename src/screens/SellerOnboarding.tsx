"use client";

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Store, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const STEPS = ['Store Info', 'Address', 'Bank & Tax', 'Review'];

export default function SellerOnboarding() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', slug: '', description: '', phone: '', logo_url: '',
    address_street: '', address_city: '', address_state: '', address_zip: '', address_country: 'IN',
    bank_name: '', bank_account_number: '', bank_ifsc: '', tax_id: '',
  });

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));
  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('sellers').insert({
        ...form,
        slug: form.slug || generateSlug(form.name),
        user_id: user.id,
        status: 'pending',
      });
      if (error) throw error;

      // Add seller role
      await supabase.from('user_roles').insert({ user_id: user.id, role: 'seller' as any });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="container max-w-lg py-20 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-success/10 mb-6">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h1 className="text-3xl font-heading mb-3">Application Submitted!</h1>
        <p className="text-muted-foreground mb-8">
          Your seller application is under review. We'll notify you once it's approved. This usually takes 1-2 business days.
        </p>
        <Button onClick={() => router.push('/')}>Back to Home</Button>
      </div>
    );
  }

  const canNext = () => {
    if (step === 0) return form.name.trim() && form.phone.trim();
    if (step === 1) return form.address_street.trim() && form.address_city.trim() && form.address_state.trim() && form.address_zip.trim();
    if (step === 2) return form.bank_name.trim() && form.bank_account_number.trim() && form.bank_ifsc.trim() && form.tax_id.trim();
    return true;
  };

  return (
    <div className="container max-w-xl py-12 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <Store className="h-6 w-6 text-accent" />
        <h1 className="text-3xl font-heading">Become a Seller</h1>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-1 mb-10">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-medium transition-colors ${i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {i + 1}
            </div>
            <span className={`ml-2 text-xs hidden sm:inline ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: Store Info */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Store Name *</Label>
            <Input value={form.name} onChange={e => { set('name', e.target.value); if (!form.slug) set('slug', generateSlug(e.target.value)); }} placeholder="Your store name" />
          </div>
          <div className="space-y-2">
            <Label>Store Slug</Label>
            <Input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="auto-generated-from-name" />
            <p className="text-xs text-muted-foreground">This will be your store URL: /seller/{form.slug || 'your-slug'}</p>
          </div>
          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9876543210" />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Tell us about your store..." />
          </div>
        </div>
      )}

      {/* Step 1: Address */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Street Address *</Label>
            <Input value={form.address_street} onChange={e => set('address_street', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={form.address_city} onChange={e => set('address_city', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Input value={form.address_state} onChange={e => set('address_state', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>ZIP Code *</Label>
              <Input value={form.address_zip} onChange={e => set('address_zip', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={form.address_country} onChange={e => set('address_country', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Bank & Tax */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Bank Name *</Label>
            <Input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="e.g. State Bank of India" />
          </div>
          <div className="space-y-2">
            <Label>Account Number *</Label>
            <Input value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>IFSC Code *</Label>
            <Input value={form.bank_ifsc} onChange={e => set('bank_ifsc', e.target.value)} placeholder="e.g. SBIN0001234" />
          </div>
          <div className="space-y-2">
            <Label>Tax ID / GSTIN *</Label>
            <Input value={form.tax_id} onChange={e => set('tax_id', e.target.value)} placeholder="e.g. 22AAAAA0000A1Z5" />
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="border rounded-sm p-4 space-y-3">
            <h3 className="font-heading text-sm text-muted-foreground uppercase tracking-wider">Store Info</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Name</span><span>{form.name}</span>
              <span className="text-muted-foreground">Phone</span><span>{form.phone}</span>
              <span className="text-muted-foreground">Slug</span><span>{form.slug || generateSlug(form.name)}</span>
            </div>
          </div>
          <div className="border rounded-sm p-4 space-y-3">
            <h3 className="font-heading text-sm text-muted-foreground uppercase tracking-wider">Address</h3>
            <p className="text-sm">{form.address_street}, {form.address_city}, {form.address_state} {form.address_zip}</p>
          </div>
          <div className="border rounded-sm p-4 space-y-3">
            <h3 className="font-heading text-sm text-muted-foreground uppercase tracking-wider">Bank & Tax</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Bank</span><span>{form.bank_name}</span>
              <span className="text-muted-foreground">Account</span><span>****{form.bank_account_number.slice(-4)}</span>
              <span className="text-muted-foreground">IFSC</span><span>{form.bank_ifsc}</span>
              <span className="text-muted-foreground">Tax ID</span><span>{form.tax_id}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
          Back
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
            Continue
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Application'}
          </Button>
        )}
      </div>
    </div>
  );
}
