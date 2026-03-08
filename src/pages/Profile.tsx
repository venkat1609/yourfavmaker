import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('addresses').select('*').eq('user_id', user!.id).order('is_default', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: { full_name: string; phone: string }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); toast.success('Profile updated'); },
    onError: () => toast.error('Failed to update profile'),
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('addresses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['addresses'] }); toast.success('Address removed'); },
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (profile && !initialized) {
    setName(profile.full_name || '');
    setPhone(profile.phone || '');
    setInitialized(true);
  }

  if (profileLoading) return <div className="container py-12"><div className="h-40 bg-secondary rounded-sm animate-pulse" /></div>;

  return (
    <div className="container py-12 max-w-2xl animate-fade-in">
      <h1 className="text-3xl font-heading mb-8">Profile</h1>

      <section className="mb-12">
        <h2 className="text-lg font-heading mb-4">Personal Information</h2>
        <form
          onSubmit={e => { e.preventDefault(); updateProfile.mutate({ full_name: name, phone }); }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={profile?.email || ''} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <Button type="submit" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading">Addresses</h2>
          <AddAddressDialog userId={user!.id} />
        </div>
        {addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No addresses saved</p>
        ) : (
          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} className="flex items-start justify-between border rounded-sm p-4">
                <div className="flex gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{addr.label} {addr.is_default && <span className="text-xs text-accent">(Default)</span>}</p>
                    <p className="text-sm text-muted-foreground">{addr.street}</p>
                    <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} {addr.zip}</p>
                  </div>
                </div>
                <button onClick={() => deleteAddress.mutate(addr.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AddAddressDialog({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: 'Home', street: '', city: '', state: '', zip: '', country: 'US' });

  const addAddress = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('addresses').insert({ ...form, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address added');
      setOpen(false);
      setForm({ label: 'Home', street: '', city: '', state: '', zip: '', country: 'US' });
    },
    onError: () => toast.error('Failed to add address'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Address</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); addAddress.mutate(); }} className="space-y-3">
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
          <Button type="submit" className="w-full" disabled={addAddress.isPending}>Save Address</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
