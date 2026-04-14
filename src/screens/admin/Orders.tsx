"use client";

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AdminMasterTable } from '@/components/AdminMasterTable';
import { Eye } from 'lucide-react';

type AdminOrderItem = {
  id: string;
  product_name: string;
  variant_name: string | null;
  price: number;
  quantity: number;
};

type AdminOrder = {
  id: string;
  user_id: string;
  created_at: string;
  status: string;
  total: number;
  shipping_address: Record<string, string> | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  order_items: AdminOrderItem[];
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

export default function Orders() {
  const queryClient = useQueryClient();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data: ordersData, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((ordersData || []).map(o => o.user_id))];
      const { data: profilesData } = await supabase.from('profiles').select('user_id, full_name, email, phone').in('user_id', userIds);
      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p]));
      return (ordersData || []).map(o => ({ ...(o as unknown as AdminOrder), profile: profileMap.get(o.user_id) || null })) as AdminOrder[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Status updated');
    },
  });

  const columns = useMemo(
    () => [
      {
        id: 'order',
        header: 'Order',
        accessor: (order: AdminOrder) => (
          <div className="space-y-0.5">
            <p className="font-semibold">#{order.id.slice(0, 8)}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}</p>
          </div>
        ),
        filterFn: (order: AdminOrder, query: string) => order.id.toLowerCase().includes(query),
        sortable: true,
        sortAccessor: (order: AdminOrder) => order.created_at,
        width: '220px',
      },
      {
        id: 'customer',
        header: 'Customer',
        accessor: (order: AdminOrder) => (
          <div>
            <p className="font-medium text-sm text-foreground">{order.profile?.full_name || order.profile?.email || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">{order.profile?.email || 'No email'}</p>
          </div>
        ),
        filterFn: (order: AdminOrder, query: string) =>
          (order.profile?.full_name || '').toLowerCase().includes(query) || (order.profile?.email || '').toLowerCase().includes(query),
        sortable: true,
        sortAccessor: (order: AdminOrder) => (order.profile?.full_name || order.profile?.email || '').toLowerCase(),
      },
      {
        id: 'status',
        header: 'Status',
        accessor: (order: AdminOrder) => (
          <Badge variant="outline" className="text-xs capitalize">
            {order.status}
          </Badge>
        ),
        filterFn: (order: AdminOrder, query: string) => order.status.toLowerCase().includes(query),
        sortable: true,
        sortAccessor: (order: AdminOrder) => order.status,
        align: 'center',
        width: '140px',
      },
      {
        id: 'total',
        header: 'Total',
        accessor: (order: AdminOrder) => `₹${Number(order.total).toFixed(2)}`,
        align: 'right',
        sortable: true,
        sortAccessor: (order: AdminOrder) => Number(order.total),
      },
      {
        id: 'actions',
        header: 'Actions',
        accessor: (order: AdminOrder) => (
          <div className="flex items-center gap-2">
            <Select
              value={order.status}
              onValueChange={(value) => updateStatus.mutate({ id: order.id, status: value })}
              className="w-32"
            >
              <SelectTrigger className="h-8 px-2 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                  <SelectItem key={status} value={status} className="capitalize text-xs">
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedOrder(order.id)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ),
        filterable: false,
        sortable: false,
        align: 'center',
        width: '200px',
      },
    ],
    [updateStatus],
  );

  const selectedOrder = useMemo(() => orders.find((order) => order.id === expandedOrder) || null, [orders, expandedOrder]);

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
      <AdminMasterTable
        columns={columns}
        data={orders}
        rowKey={(order) => order.id}
        options={{ showFilters: true, showPagination: true, pageSize: 10, pageSizeOptions: [10, 25, 50], showSelection: false }}
      />

      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) setExpandedOrder(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Customer</p>
                <p className="font-medium text-foreground">{selectedOrder.profile?.full_name || '—'}</p>
                <p className="text-xs text-muted-foreground">{selectedOrder.profile?.email || '—'}</p>
                {selectedOrder.profile?.phone && <p className="text-xs text-muted-foreground">{selectedOrder.profile.phone}</p>}
              </div>
              {selectedOrder.shipping_address && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Shipping Address</p>
                  <p className="font-medium text-foreground">{(selectedOrder.shipping_address as any).street || '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedOrder.shipping_address as any).city || '—'}, {(selectedOrder.shipping_address as any).state || '—'} — {(selectedOrder.shipping_address as any).pincode || (selectedOrder.shipping_address as any).zip || '—'}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Payment</p>
                <p className="font-medium text-foreground">₹{Number(selectedOrder.total).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Items</p>
                <div className="border rounded-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2.5 font-medium text-xs">Product</th>
                        <th className="text-right p-2.5 font-medium text-xs">Price</th>
                        <th className="text-right p-2.5 font-medium text-xs">Qty</th>
                        <th className="text-right p-2.5 font-medium text-xs">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.order_items || []).map((item: AdminOrderItem) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="p-2.5"><p>{item.product_name}</p>{item.variant_name && <p className="text-xs text-muted-foreground">{item.variant_name}</p>}</td>
                          <td className="p-2.5 text-right text-muted-foreground">₹{Number(item.price).toFixed(2)}</td>
                          <td className="p-2.5 text-right text-muted-foreground">{item.quantity}</td>
                          <td className="p-2.5 text-right font-medium">₹{(Number(item.price) * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t">
                        <td colSpan={3} className="p-2.5 text-right font-medium text-xs">Total</td>
                        <td className="p-2.5 text-right font-medium">₹{Number(selectedOrder.total).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
