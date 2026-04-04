"use client";

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Trash2, Search, Eye, CheckCircle, XCircle, Clock, Package, type LucideIcon } from 'lucide-react';
import { PaginationControls, usePagination } from '@/components/PaginationControls';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Database } from '@/integrations/supabase/types';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-accent/10 text-accent border-accent/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

const STATUS_ICONS: Record<string, LucideIcon> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

type StoreRow = Database['public']['Tables']['stores']['Row'];
type StorePaymentRow = Database['public']['Tables']['store_payments']['Row'];
type StoreStatus = StoreRow['status'];

export default function Sellers() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewStore, setViewStore] = useState<StoreRow | null>(null);
  const ITEMS_PER_PAGE = 10;

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
      return data;
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
      setViewStore(null);
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

  const filtered = useMemo(() => {
    let result = [...stores];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || (s.phone || '').includes(q));
    }
    if (filterStatus !== 'all') result = result.filter(s => s.status === filterStatus);
    return result;
  }, [stores, search, filterStatus]);

  const { totalPages, getPageItems } = usePagination(filtered, ITEMS_PER_PAGE);
  const pageStores = getPageItems(page);

  const pendingCount = stores.filter(s => s.status === 'pending').length;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading">Stores</h1>
          {pendingCount > 0 && (
            <Badge className="bg-accent text-accent-foreground">{pendingCount} pending</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search stores..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground mb-4">{filtered.length} store{filtered.length !== 1 ? 's' : ''}</p>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-secondary rounded-sm animate-pulse" />)}</div>
      ) : (
        <>
          <div className="border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Store</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Phone</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Location</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {pageStores.map(s => {
                  const initials = s.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                  const StatusIcon = STATUS_ICONS[s.status as SellerStatus] || Clock;
                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {s.logo_url ? <AvatarImage src={s.logo_url} alt={s.name} /> : null}
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                            <span className="font-medium">{s.name}</span>
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{s.phone || '-'}</td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">{s.address_city ? `${s.address_city}, ${s.address_state}` : s.location || '-'}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={STATUS_COLORS[s.status] || ''}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {s.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewStore(s)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {s.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => updateStatus.mutate({ id: s.id, status: 'approved' })}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateStatus.mutate({ id: s.id, status: 'rejected' })}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
        </>
      )}

      {/* Store Detail Dialog */}
      <Dialog open={!!viewStore} onOpenChange={() => setViewStore(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewStore && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {viewStore.logo_url ? <AvatarImage src={viewStore.logo_url} /> : null}
                    <AvatarFallback>{viewStore.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {viewStore.name}
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="store" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="store">Store</TabsTrigger>
                  <TabsTrigger value="products">Products</TabsTrigger>
                </TabsList>

                <TabsContent value="store" className="space-y-6 pt-4">
                  <Section title="Store Info">
                    <Row label="Phone" value={viewStore.phone} />
                    <Row label="Business Reg. No." value={viewStore.business_registration_number} />
                    <Row label="Description" value={viewStore.description} />
                  </Section>
                  <Section title="Address">
                    <Row label="Street" value={viewStore.address_street} />
                    <Row label="City" value={viewStore.address_city} />
                    <Row label="State" value={viewStore.address_state} />
                    <Row label="ZIP" value={viewStore.address_zip} />
                    <Row label="Country" value={viewStore.address_country} />
                  </Section>
                  <Section title="Bank & Tax">
                    <Row label="Bank" value={storePayment?.bank_name} />
                    <Row
                      label="Account"
                      value={
                        storePayment?.bank_account_number
                          ? `****${storePayment.bank_account_number.slice(-4)}`
                          : '-'
                      }
                    />
                    <Row label="IFSC" value={storePayment?.bank_ifsc} />
                    <Row label="Tax ID" value={storePayment?.tax_id} />
                  </Section>
                  <div className="flex gap-2">
                    {viewStore.status !== 'approved' && (
                      <Button className="flex-1" onClick={() => updateStatus.mutate({ id: viewStore.id, status: 'approved' })} disabled={updateStatus.isPending}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    )}
                    {viewStore.status !== 'rejected' && (
                      <Button variant="outline" className="flex-1 text-destructive" onClick={() => updateStatus.mutate({ id: viewStore.id, status: 'rejected' })} disabled={updateStatus.isPending}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="products" className="space-y-4 pt-4">
                  <div className="rounded-sm border p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-heading text-sm">Manage Products</h3>
                    </div>
                    {storeProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No products listed for this store yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {storeProducts.map(product => (
                          <div key={product.id} className="flex items-center justify-between gap-3 rounded-sm border p-3">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.category || 'General'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={product.is_active ? 'default' : 'secondary'} className="text-xs">
                                {product.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">₹{Number(product.price).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-sm p-4 space-y-2">
      <h3 className="font-heading text-xs text-muted-foreground uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-muted-foreground w-20 flex-shrink-0">{label}</span>
      <span>{value || '-'}</span>
    </div>
  );
}
