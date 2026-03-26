"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, ShoppingCart, Users, TrendingUp } from 'lucide-react';

export default function Overview() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [products, orders, users] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id, total, status', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      const totalRevenue = (orders.data || []).reduce((sum, o) => sum + Number(o.total), 0);
      const pendingOrders = (orders.data || []).filter(o => o.status === 'pending').length;

      return {
        products: products.count || 0,
        orders: orders.count || 0,
        users: users.count || 0,
        revenue: totalRevenue,
        pendingOrders,
      };
    },
  });

  const cards = [
    { label: 'Total Products', value: stats?.products ?? '—', icon: Package, color: 'text-blue-500' },
    { label: 'Total Orders', value: stats?.orders ?? '—', icon: ShoppingCart, color: 'text-green-500' },
    { label: 'Customers', value: stats?.users ?? '—', icon: Users, color: 'text-purple-500' },
    { label: 'Revenue', value: stats ? `₹${stats.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—', icon: TrendingUp, color: 'text-amber-500' },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-heading mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className="border rounded-sm p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-2xl font-heading">{card.value}</p>
          </div>
        ))}
      </div>

      {stats && stats.pendingOrders > 0 && (
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-sm p-4 text-sm">
          <span className="font-medium">⚠ {stats.pendingOrders} pending order{stats.pendingOrders !== 1 ? 's' : ''}</span>
          <span className="text-muted-foreground"> need attention.</span>
        </div>
      )}
    </div>
  );
}
