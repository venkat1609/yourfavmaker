import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { PaginationControls, usePagination } from '@/components/PaginationControls';

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  processing: 'bg-accent/20 text-accent',
  shipped: 'bg-primary/10 text-primary',
  delivered: 'bg-success/20 text-success',
  cancelled: 'bg-destructive/20 text-destructive',
};

export default function Orders() {
  const { user } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const activeOrders = orders.filter(o => ['pending', 'processing', 'shipped'].includes(o.status));
  const pastOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  if (isLoading) {
    return (
      <div className="container py-12">
        <h1 className="text-3xl font-heading mb-8">Orders</h1>
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-secondary rounded-sm animate-pulse" />)}</div>
      </div>
    );
  }

  const OrderList = ({ orders, title }: { orders: typeof activeOrders; title: string }) => (
    orders.length > 0 ? (
      <div className="mb-12">
        <h2 className="text-xl font-heading mb-4">{title}</h2>
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="border rounded-sm p-5 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={statusColors[order.status] || ''} variant="secondary">{order.status}</Badge>
                  <span className="text-sm font-medium">${Number(order.total).toFixed(2)}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {(order as any).order_items?.length || 0} item{(order as any).order_items?.length !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null
  );

  return (
    <div className="container py-12 animate-fade-in">
      <h1 className="text-3xl font-heading mb-8">Orders</h1>
      {orders.length === 0 ? (
        <p className="text-muted-foreground">No orders yet</p>
      ) : (
        <>
          <OrderList orders={activeOrders} title="Active Orders" />
          <OrderList orders={pastOrders} title="Previous Orders" />
        </>
      )}
    </div>
  );
}
