"use client";

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminMasterTable } from '@/components/AdminMasterTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2, Eye, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type StoreRow = Database['public']['Tables']['stores']['Row'];
type StorePaymentRow = Database['public']['Tables']['store_payments']['Row'];
type StoreProduct = Database['public']['Tables']['products']['Row'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-accent/10 text-accent border-accent/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function Sellers() {
  const queryClient = useQueryClient();
  const [viewStore, setViewStore] = useState<StoreRow | null>(null);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['admin-stores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: storeProducts = [] } = useQuery({
    queryKey: ['admin-store-products', viewStore?.id],
    queryFn: async () => {
      if (!viewStore?.id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', viewStore.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StoreProduct[];
    },
    enabled: !!viewStore?.id,
  });

  const { data: storePayment } = useQuery({
    queryKey: ['admin-store-payment', viewStore?.id],
    queryFn: async () => {
      if (!viewStore?.id) return null;
      const { data, error } = await supabase
        .from('store_payments')
        .select('*')
        .eq('store_id', viewStore.id)
        .maybeSingle();
      if (error) throw error;
      return data as StorePaymentRow | null;
    },
    enabled: !!viewStore?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('stores').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      toast.success(`Store ${status}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
      toast.success('Store deleted');
    },
  });

  const columns = useMemo(
    () => [
      {
        id: 'store',
        header: 'Store',
        accessor: (store: StoreRow) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {store.logo_url ? <AvatarImage src={store.logo_url} alt={store.name} /> : null}
              <AvatarFallback className="text-xs">
                {(store.name || 'S').split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{store.name || 'Untitled storefront'}</p>
              <p className="text-xs text-muted-foreground">{store.user_id?.slice(0, 8)}…</p>
            </div>
          </div>
        ),
        filterFn: (store: StoreRow, query: string) => (store.name || '').toLowerCase().includes(query),
        sortable: true,
        sortAccessor: (store: StoreRow) => (store.name || 'untitled').toLowerCase(),
        width: '240px',
      },
      {
        id: 'phone',
        header: 'Phone',
        accessor: (store: StoreRow) => store.phone || '-',
        filterFn: (store: StoreRow, query: string) => (store.phone || '').toLowerCase().includes(query),
        sortable: true,
        sortAccessor: (store: StoreRow) => (store.phone || ''),
      },
      {
        id: 'location',
        header: 'Location',
        accessor: (store: StoreRow) => (store.address_city ? `${store.address_city}, ${store.address_state}` : store.location) || '-',
        filterFn: (store: StoreRow, query: string) => ((store.address_city || store.location) || '').toLowerCase().includes(query),
        sortable: true,
        sortAccessor: (store: StoreRow) => ((store.address_city || store.location) || '').toLowerCase(),
        align: 'left',
      },
      {
        id: 'status',
        header: 'Status',
        accessor: (store: StoreRow) => (
          <Badge variant="outline" className={`${STATUS_COLORS[store.status] || ''} text-xs`}> 
            {store.status}
          </Badge>
        ),
        filterFn: (store: StoreRow, query: string) => store.status.toLowerCase().includes(query),
        sortable: true,
        sortAccessor: (store: StoreRow) => store.status,
        align: 'center',
        width: '150px',
      },
      {
        id: 'actions',
        header: 'Actions',
        accessor: (store: StoreRow) => (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewStore(store)}>
              <Eye className="h-4 w-4" />
            </Button>
            {store.status === 'pending' && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => updateStatus.mutate({ id: store.id, status: 'approved' })}>
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateStatus.mutate({ id: store.id, status: 'rejected' })}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(store.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        filterable: false,
        sortable: false,
        width: '200px',
      },
    ],
    [deleteMutation, updateStatus],
  );

  const pendingCount = stores.filter((s) => s.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-16 bg-secondary rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-end mb-4">
        {pendingCount > 0 && (
          <Badge className="bg-accent text-accent-foreground">{pendingCount} pending</Badge>
        )}
      </div>

      <AdminMasterTable
        columns={columns}
        data={stores}
        rowKey={(store) => store.id}
        options={{ showFilters: true, showPagination: true, pageSize: 10, pageSizeOptions: [10, 25, 50], showSelection: false }}
      />

      <Dialog open={!!viewStore} onOpenChange={() => setViewStore(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewStore && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{viewStore.name || 'Store details'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <p className="text-xs uppercase tracking-wider">Description</p>
                  <p className="font-medium text-foreground">{viewStore.description || 'No description provided.'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider">Location</p>
                  <p className="font-medium text-foreground">{viewStore.location || 'Not provided'}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider">GSTIN</p>
                    <p className="font-medium text-foreground">{viewStore.business_registration_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider">PAN</p>
                    <p className="font-medium text-foreground">{viewStore.pan || '—'}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Products</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {storeProducts.slice(0, 4).map((product) => (
                    <div key={product.id} className="border rounded-sm p-3 text-sm space-y-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">₹{Number(product.price).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
              {storePayment && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="text-xs uppercase tracking-wider">Payment</p>
                  <p>Bank: {storePayment.bank_name || '—'}</p>
                  <p>Account: {storePayment.bank_account_number || '—'}</p>
                  <p>IFSC: {storePayment.bank_ifsc || '—'}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
