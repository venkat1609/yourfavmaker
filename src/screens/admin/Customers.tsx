"use client";

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { PaginationControls, usePagination } from '@/components/PaginationControls';

export default function Customers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const USERS_PER_PAGE = 15;

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(p => (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q) || (p.phone || '').toLowerCase().includes(q));
  }, [profiles, search]);

  useEffect(() => { setPage(1); }, [search]);
  const { totalPages, getPageItems } = usePagination(filtered, USERS_PER_PAGE);
  const pageProfiles = getPageItems(page);

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-secondary rounded-sm animate-pulse" />)}</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-heading mb-6">Customers</h1>
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</p>
      <div className="border rounded-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50"><th className="text-left p-3 font-medium">Name</th><th className="text-left p-3 font-medium">Email</th><th className="text-left p-3 font-medium hidden md:table-cell">Phone</th><th className="text-left p-3 font-medium hidden md:table-cell">Joined</th></tr></thead>
          <tbody>
            {pageProfiles.map(p => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-3">{p.full_name || '-'}</td>
                <td className="p-3 text-muted-foreground">{p.email}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{p.phone || '-'}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{format(new Date(p.created_at), 'MMM d, yyyy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">No customers found</p>}
      </div>
      <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
    </div>
  );
}
