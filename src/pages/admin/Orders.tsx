import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PaginationControls, usePagination } from '@/components/PaginationControls';

export default function Orders() {
  const queryClient = useQueryClient();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const ORDERS_PER_PAGE = 10;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data: ordersData, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((ordersData || []).map(o => o.user_id))];
      const { data: profilesData } = await supabase.from('profiles').select('user_id, full_name, email, phone').in('user_id', userIds);
      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
      return (ordersData || []).map(o => ({ ...o, profile: profileMap.get(o.user_id) || null }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Status updated'); },
  });

  const filtered = useMemo(() => {
    let result = [...orders];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o: any) => o.id.toLowerCase().includes(q) || (o.profile?.full_name || '').toLowerCase().includes(q) || (o.profile?.email || '').toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') result = result.filter(o => o.status === filterStatus);
    return result;
  }, [orders, search, filterStatus]);

  useEffect(() => { setPage(1); }, [search, filterStatus]);
  const { totalPages, getPageItems } = usePagination(filtered, ORDERS_PER_PAGE);
  const pageOrders = getPageItems(page);

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-secondary rounded-sm animate-pulse" />)}</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-heading mb-6">Orders</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders, customer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground mb-4">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</p>

      <div className="space-y-4">
        {pageOrders.map((order: any) => {
          const isExpanded = expandedOrder === order.id;
          const shipping = order.shipping_address as Record<string, string> | null;
          return (
            <div key={order.id} className="border rounded-sm overflow-hidden">
              <button onClick={() => setExpandedOrder(isExpanded ? null : order.id)} className="w-full text-left p-5 hover:bg-muted/30 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">#{order.id.slice(0, 8)} · {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}</p>
                    <p className="text-sm font-medium">{order.profile?.full_name || order.profile?.email || 'Unknown'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">{order.status}</Badge>
                    <span className="text-sm font-medium">₹{Number(order.total).toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{order.order_items?.length || 0} item{order.order_items?.length !== 1 ? 's' : ''}</p>
              </button>
              {isExpanded && (
                <div className="border-t p-5 space-y-5 bg-muted/10 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Update Status</Label>
                    <Select value={order.status} onValueChange={v => updateStatus.mutate({ id: order.id, status: v })}>
                      <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Customer</h4>
                    <div className="text-sm space-y-0.5">
                      <p>{order.profile?.full_name || '—'}</p>
                      <p className="text-muted-foreground">{order.profile?.email || '—'}</p>
                      {order.profile?.phone && <p className="text-muted-foreground">{order.profile.phone}</p>}
                    </div>
                  </div>
                  {shipping && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Shipping Address</h4>
                      <div className="text-sm space-y-0.5">
                        {shipping.full_name && <p className="font-medium">{shipping.full_name}</p>}
                        <p className="text-muted-foreground">{shipping.street}</p>
                        <p className="text-muted-foreground">{shipping.city}, {shipping.state} — {shipping.pincode || shipping.zip}</p>
                        {shipping.phone && <p className="text-muted-foreground">+91 {shipping.phone}</p>}
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Payment</h4>
                    <div className="text-sm space-y-0.5">
                      {order.razorpay_payment_id ? (
                        <>
                          <p>Payment ID: <span className="text-muted-foreground font-mono text-xs">{order.razorpay_payment_id}</span></p>
                          <p>Order ID: <span className="text-muted-foreground font-mono text-xs">{order.razorpay_order_id}</span></p>
                        </>
                      ) : <p className="text-muted-foreground">No payment recorded</p>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Items</h4>
                    <div className="border rounded-sm overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b bg-muted/50"><th className="text-left p-2.5 font-medium text-xs">Product</th><th className="text-right p-2.5 font-medium text-xs">Price</th><th className="text-right p-2.5 font-medium text-xs">Qty</th><th className="text-right p-2.5 font-medium text-xs">Total</th></tr></thead>
                        <tbody>
                          {(order.order_items || []).map((item: any) => (
                            <tr key={item.id} className="border-b last:border-0">
                              <td className="p-2.5"><p>{item.product_name}</p>{item.variant_name && <p className="text-xs text-muted-foreground">{item.variant_name}</p>}</td>
                              <td className="p-2.5 text-right text-muted-foreground">₹{Number(item.price).toFixed(2)}</td>
                              <td className="p-2.5 text-right text-muted-foreground">{item.quantity}</td>
                              <td className="p-2.5 text-right font-medium">₹{(Number(item.price) * item.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot><tr className="border-t"><td colSpan={3} className="p-2.5 text-right font-medium text-xs">Total</td><td className="p-2.5 text-right font-medium">₹{Number(order.total).toFixed(2)}</td></tr></tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-muted-foreground text-center py-8">No orders found</p>}
        <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} className="mt-4" />
      </div>
    </div>
  );
}
