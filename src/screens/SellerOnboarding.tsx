"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Store, CheckCircle } from 'lucide-react';

type OnboardingForm = {
  name: string;
  description: string;
  location: string;
  business_registration_number: string;
  pan: string;
};

const DEFAULT_FORM: OnboardingForm = {
  name: '',
  description: '',
  location: '',
  business_registration_number: '',
  pan: '',
};

const REQUIRED_FIELDS: (keyof OnboardingForm)[] = [
  'name',
  'location',
  'business_registration_number',
  'pan',
];

export default function SellerOnboarding() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<OnboardingForm>(DEFAULT_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => {
      if (prev.name.trim()) return prev;
      const metadataName =
        typeof user.user_metadata === 'object' && user.user_metadata
          ? (user.user_metadata as { full_name?: string }).full_name
          : '';
      const inferred = metadataName || user.email?.split('@')[0] || '';
      if (!inferred) return prev;
      return { ...prev, name: inferred };
    });
  }, [user]);

  const setField = <K extends keyof OnboardingForm>(field: K, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit = REQUIRED_FIELDS.every((field) => form[field].trim().length > 0);

  const handleSubmit = async () => {
    if (!user) return;
    if (!canSubmit) {
      toast.error('Please fill the required fields before submitting.');
      return;
    }

    setLoadingSubmit(true);

    try {
      const { data: createdStore, error: storeError } = await supabase
        .from('stores')
        .insert({
          user_id: user.id,
          name: form.name.trim(),
          description: form.description.trim() || null,
          location: form.location.trim() || null,
          business_registration_number: form.business_registration_number.trim() || null,
          pan: form.pan.trim() || null,
          status: 'pending',
        })
        .select('id, slug')
        .single();

      if (storeError || !createdStore?.id) throw storeError ?? new Error('Unable to create store.');

      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'seller')
        .maybeSingle();
      if (!existingRole) {
        const { error: roleError } = await supabase.from('user_roles').insert({ user_id: user.id, role: 'seller' });
        if (roleError) throw roleError;
      }

      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'seller_application',
        title: 'Seller Application Submitted',
        body: `Your storefront ${form.name.trim()} is under review.`,
        related_store_id: createdStore.id,
        metadata: {
          store_name: form.name.trim(),
          status: 'pending',
        },
      });
      if (notificationError) {
        console.error('Failed to insert seller application notification', notificationError.message);
      }

      const { data: adminRoles, error: adminRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      if (adminRolesError) {
        console.error('Failed to load admin recipients for seller notification', adminRolesError.message);
      } else {
        const adminNotifications = (adminRoles ?? [])
          .filter(({ user_id }) => !!user_id)
          .map(({ user_id }) => ({
            user_id,
            type: 'seller_application',
            title: 'New storefront application',
            body: `${form.name.trim()} just applied for seller access`,
            related_store_id: createdStore.id,
            metadata: {
              applicant_id: user.id,
              store_name: form.name.trim(),
              status: 'pending',
            },
          }));

        if (adminNotifications.length > 0) {
          const { error: adminInsertError } = await supabase.from('notifications').insert(adminNotifications);
          if (adminInsertError) {
            console.error('Failed to insert admin seller notifications', adminInsertError.message);
          }
        }
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit application';
      toast.error(message);
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (submitted) {
    return (
      <div className="container max-w-lg py-20 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-success/10 mb-6">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h1 className="text-3xl font-heading mb-3">Store Application Submitted!</h1>
        <p className="text-muted-foreground mb-8">
          Your storefront application is under review. We'll notify you once it’s approved, typically within 1-2
          business days.
        </p>
        <Button onClick={() => router.push('/')}>Back to Home</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container max-w-lg py-20 text-center">
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-lg py-20 text-center animate-fade-in">
        <Store className="h-8 w-8 mx-auto text-accent mb-4" />
        <h1 className="text-2xl font-heading mb-2">Log in to continue</h1>
        <p className="text-muted-foreground mb-6">
          Creating a seller account requires an authenticated user. Please sign in before you continue.
        </p>
        <Button onClick={() => router.push('/auth')}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-12 animate-fade-in space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Store className="h-6 w-6 text-accent" />
          <h1 className="text-3xl font-heading">Become a Seller</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Start with the essentials — share a name, location, and compliance details, and we’ll handle the rest.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        className="space-y-6 rounded-3xl border border-border bg-background/50 p-6"
      >
        <div className="space-y-3">
          <Label className="font-semibold">Store name *</Label>
          <Input value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Ethereal Studio" />
        </div>

        <div className="space-y-3">
          <Label className="font-semibold">Location *</Label>
          <Input value={form.location} onChange={(event) => setField('location', event.target.value)} placeholder="Dubai, UAE" />
        </div>

        <div className="space-y-3">
          <Label className="font-semibold">GSTIN *</Label>
          <Input
            value={form.business_registration_number}
            onChange={(event) => setField('business_registration_number', event.target.value.toUpperCase())}
            placeholder="22AAAAA0000A1Z5"
          />
          <p className="text-xs text-muted-foreground">
            We'll verify via the GST API before approving your storefront.
          </p>
        </div>

        <div className="space-y-3">
          <Label className="font-semibold">PAN *</Label>
          <Input
            value={form.pan}
            onChange={(event) => setField('pan', event.target.value.toUpperCase())}
            placeholder="AAAAA0000A"
          />
        </div>

        <div className="space-y-3">
          <Label className="font-semibold">Description</Label>
          <Textarea
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
            rows={3}
            placeholder="A quick note about what you sell."
          />
        </div>

        <Button type="submit" className="w-full" disabled={!canSubmit || loadingSubmit}>
          {loadingSubmit ? 'Submitting...' : 'Submit Application'}
        </Button>
      </form>
    </div>
  );
}
