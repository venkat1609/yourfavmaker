"use client";

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Check, X } from 'lucide-react';
import { AdminMasterTable } from '@/components/AdminMasterTable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type StoreRow = Database['public']['Tables']['stores']['Row'];

type ProcessingAction = { storeId: string; type: 'approve' | 'reject' };

const fetchPendingStores = async () => {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, description, location, business_registration_number, pan, user_id, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as StoreRow[];
};

export default function PendingSellerApplicationsPage() {
  const queryClient = useQueryClient();
  const [processingAction, setProcessingAction] = useState<ProcessingAction | null>(null);
  const [activeStoreDetail, setActiveStoreDetail] = useState<StoreRow | null>(null);

  const { data: pendingStores = [], isLoading } = useQuery({ queryKey: ['pending-seller-requests'], queryFn: fetchPendingStores });

  const approveMutation = useMutation({
    mutationFn: async (storeId: string) => {
      const { error } = await supabase.from('stores').update({ status: 'approved' }).eq('id', storeId);
      if (error) throw error;
    },
    onMutate: (storeId) => setProcessingAction({ storeId, type: 'approve' }),
    onSettled: () => setProcessingAction(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-seller-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Seller request approved');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to approve request');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (storeId: string) => {
      const { error } = await supabase.from('stores').update({ status: 'rejected' }).eq('id', storeId);
      if (error) throw error;
    },
    onMutate: (storeId) => setProcessingAction({ storeId, type: 'reject' }),
    onSettled: () => setProcessingAction(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-seller-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast('Seller request rejected');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to reject request');
    },
  });

  const columns = useMemo(
    () => [
      {
        id: 'store',
        header: 'Store',
        accessor: (store: StoreRow) => (
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{store.name || 'Untitled storefront'}</p>
            <p className="text-xs text-muted-foreground truncate">{store.description || 'No description provided'}</p>
            <p className="text-xs text-muted-foreground">
              Submitted by {store.user_id ? `${store.user_id.slice(0, 8)}…` : 'N/A'}
            </p>
          </div>
        ),
        filterFn: (store: StoreRow, query: string) => {
          const haystack = `${store.name} ${store.description ?? ''} ${store.user_id ?? ''}`.toLowerCase();
          return haystack.includes(query);
        },
        width: '280px',
        sortable: true,
        sortAccessor: (store) => store.name?.toLowerCase() || '',
      },
      {
        id: 'location',
        header: 'Location',
        accessor: (store: StoreRow) => store.location || 'Location not provided',
        filterFn: (store: StoreRow, query: string) => (store.location || '').toLowerCase().includes(query),
        sortable: true,
        sortAccessor: (store) => store.location?.toLowerCase() || '',
      },
      {
        id: 'credentials',
        header: 'GSTIN · PAN',
        accessor: (store: StoreRow) => (
          <div className="text-muted-foreground">
            <div className="text-foreground">{store.business_registration_number || '—'}</div>
            <div>{store.pan || '—'}</div>
          </div>
        ),
        filterFn: (store: StoreRow, query: string) => {
          const haystack = `${store.business_registration_number ?? ''} ${store.pan ?? ''}`.toLowerCase();
          return haystack.includes(query);
        },
        sortable: true,
        sortAccessor: (store: StoreRow) => `${store.business_registration_number ?? ''}-${store.pan ?? ''}`.toLowerCase(),
      },
      {
        id: 'submitted',
        header: 'Submitted',
        accessor: (store: StoreRow) =>
          store.created_at
            ? new Date(store.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
            : '—',
        align: 'left',
        filterable: true,
        filterFn: (store: StoreRow, query: string) =>
          Boolean(store.created_at && store.created_at.toLowerCase().includes(query)),
        sortable: true,
        sortAccessor: (store: StoreRow) => store.created_at || '',
      },
      {
        id: 'actions',
        header: 'Actions',
        accessor: (store: StoreRow) => {
          const isProcessingThisStore = processingAction?.storeId === store.id;
          return (
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setActiveStoreDetail(store)}
              >
                <Eye className="h-4 w-4" />
                <span className="sr-only">View request info</span>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-success"
                onClick={() => approveMutation.mutate(store.id)}
                disabled={isProcessingThisStore}
              >
                <Check className="h-4 w-4" />
                <span className="sr-only">Approve request</span>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => rejectMutation.mutate(store.id)}
                disabled={isProcessingThisStore}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Reject request</span>
              </Button>
            </div>
          );
        },
        filterable: false,
        align: 'center',
        width: '160px',
        sortable: false,
      },
    ],
    [approveMutation, rejectMutation, processingAction],
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading">Pending seller applications</h1>
          <p className="text-sm text-muted-foreground">Review and approve storefront requests.</p>
        </div>
      </div>

      <div className="border rounded-sm bg-background/70 p-4 text-sm text-muted-foreground">
        {isLoading ? 'Loading …' : `${pendingStores.length} request${pendingStores.length === 1 ? '' : 's'} awaiting review`}
      </div>

      <AdminMasterTable
        columns={columns}
        data={pendingStores}
        rowKey={(store) => store.id}
        options={{ pageSize: 10, pageSizeOptions: [10, 20, 50] }}
      />

      <Dialog
        open={Boolean(activeStoreDetail)}
        onOpenChange={(open) => {
          if (!open) setActiveStoreDetail(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{activeStoreDetail?.name || 'Store Request details'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Review information before approving or rejecting the storefront.
            </DialogDescription>
          </DialogHeader>
          {activeStoreDetail && (
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Description</p>
                <p className="font-medium text-base text-foreground">{activeStoreDetail.description || 'No description provided.'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Location</p>
                <p className="font-medium text-base text-foreground">{activeStoreDetail.location || 'Not provided'}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">GSTIN</p>
                  <p className="font-medium text-foreground">{activeStoreDetail.business_registration_number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">PAN</p>
                  <p className="font-medium text-foreground">{activeStoreDetail.pan || '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Submitted</p>
                <p className="font-medium text-foreground">
                  {activeStoreDetail.created_at
                    ? new Date(activeStoreDetail.created_at).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">User ID</p>
                <p className="font-mono text-sm text-foreground">{activeStoreDetail.user_id || '—'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button size="sm" variant="secondary" onClick={() => setActiveStoreDetail(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
