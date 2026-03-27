"use client";

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

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

  const updateProfile = useMutation({
    mutationFn: async (updates: { full_name: string; phone: string }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }); toast.success('Profile updated'); },
    onError: () => toast.error('Failed to update profile'),
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name || '');
    setPhone(profile.phone || '');
  }, [profile]);

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
    </div>
  );
}
