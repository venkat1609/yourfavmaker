"use client";

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Trash2, MapPin, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type AddressRecord = {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  is_primary: boolean;
};

type AddressFormState = {
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export default function ProfileAddresses() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('addresses').select('*').eq('user_id', user!.id).order('is_primary', { ascending: false });
      if (error) throw error;
      return data as AddressRecord[];
    },
    enabled: !!user,
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('addresses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['addresses'] }); toast.success('Address removed'); },
  });

  if (loading || !user) {
    return (
      <div className="container py-12 max-w-2xl">
        <div className="h-40 bg-secondary rounded-sm animate-pulse" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container py-12 max-w-2xl">
        <div className="h-40 bg-secondary rounded-sm animate-pulse" />
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-2xl animate-fade-in">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-heading">Addresses</h1>
        <AddAddressDialog userId={user.id} />
      </div>

      {addresses.length === 0 ? (
        <div className="border rounded-sm p-8 text-center">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No addresses saved</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map(addr => (
            <div key={addr.id} className="flex items-start justify-between border rounded-sm p-4">
              <div className="flex gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {addr.label} {addr.is_primary && <span className="text-xs text-accent">(Primary)</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">{addr.street}</p>
                  <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} {addr.zip}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <EditAddressDialog userId={user.id} address={addr} />
                <button onClick={() => deleteAddress.mutate(addr.id)} className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${addr.label} address`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddAddressDialog({ userId }: { userId: string }) {
  return <AddressDialog userId={userId} mode="add" />;
}

function EditAddressDialog({ userId, address }: { userId: string; address: AddressRecord }) {
  return <AddressDialog userId={userId} mode="edit" address={address} />;
}

function AddressDialog({
  userId,
  mode,
  address,
}: {
  userId: string;
  mode: 'add' | 'edit';
  address?: AddressRecord;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddressFormState>({ label: 'Home', street: '', city: '', state: '', zip: '', country: 'US' });
  const [isPrimary, setIsPrimary] = useState(false);
  const checkboxId = mode === 'edit' && address ? `profile-primary-${address.id}` : 'profile-primary-add';

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && address) {
      setForm({
        label: address.label,
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country || 'US',
      });
      setIsPrimary(address.is_primary);
      return;
    }

    setForm({ label: 'Home', street: '', city: '', state: '', zip: '', country: 'US' });
    setIsPrimary(false);
  }, [address, mode, open]);

  const saveAddress = useMutation({
    mutationFn: async () => {
      if (mode === 'edit') {
        if (!address) throw new Error('Missing address to edit');
        const { error } = await supabase
          .from('addresses')
          .update({ ...form, is_primary: isPrimary })
          .eq('id', address.id)
          .eq('user_id', userId);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('addresses').insert({ ...form, user_id: userId, is_primary: isPrimary });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success(mode === 'edit' ? 'Address updated' : 'Address added');
      setOpen(false);
      setForm({ label: 'Home', street: '', city: '', state: '', zip: '', country: 'US' });
      setIsPrimary(false);
    },
    onError: () => toast.error(mode === 'edit' ? 'Failed to update address' : 'Failed to add address'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'edit' ? (
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label={`Edit ${address?.label || 'address'}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === 'edit' ? 'Edit Address' : 'Add Address'}</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); saveAddress.mutate(); }} className="space-y-3">
          <div className="space-y-2"><Label>Label</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Street</Label><Input value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required /></div>
            <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>ZIP</Label><Input value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} required /></div>
          </div>
          <div className="flex items-center gap-2 rounded-sm border p-3">
            <Checkbox id={checkboxId} checked={isPrimary} onCheckedChange={checked => setIsPrimary(checked === true)} />
            <Label htmlFor={checkboxId} className="text-sm font-normal cursor-pointer">
              Save as primary address
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={saveAddress.isPending}>
            {mode === 'edit' ? 'Update Address' : 'Save Address'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
