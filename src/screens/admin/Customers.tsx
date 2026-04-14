"use client";

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { AdminMasterTable } from '@/components/AdminMasterTable';
import type { Database } from '@/integrations/supabase/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export default function Customers() {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessor: (profile: ProfileRow) => profile.full_name || '-',
        filterFn: (profile: ProfileRow, query: string) =>
          (profile.full_name || '').toLowerCase().includes(query) || (profile.email || '').toLowerCase().includes(query),
        sortable: true,
        sortAccessor: (profile: ProfileRow) => (profile.full_name || profile.email || '').toLowerCase(),
        width: '220px',
      },
      {
        id: 'email',
        header: 'Email',
        accessor: (profile: ProfileRow) => profile.email || '-',
        filterFn: (profile: ProfileRow, query: string) => (profile.email || '').toLowerCase().includes(query),
        sortable: true,
        sortAccessor: (profile: ProfileRow) => (profile.email || '').toLowerCase(),
      },
      {
        id: 'phone',
        header: 'Phone',
        accessor: (profile: ProfileRow) => profile.phone || '-',
        filterFn: (profile: ProfileRow, query: string) => (profile.phone || '').toLowerCase().includes(query),
        sortable: true,
        sortAccessor: (profile: ProfileRow) => (profile.phone || ''),
      },
      {
        id: 'joined',
        header: 'Joined',
        accessor: (profile: ProfileRow) => format(new Date(profile.created_at), 'MMM d, yyyy'),
        align: 'right',
        filterable: false,
        sortable: true,
        sortAccessor: (profile: ProfileRow) => profile.created_at,
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-12 bg-secondary rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <AdminMasterTable
        columns={columns}
        data={profiles}
        rowKey={(profile) => profile.id}
        options={{ showFilters: true, showPagination: true, pageSize: 12, pageSizeOptions: [12, 24, 48], showSelection: false }}
      />
    </div>
  );
}
