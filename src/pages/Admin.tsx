import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Package, Users, ShoppingCart } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function Admin() {
  const { isAdmin, loading } = useAuth();

  if (loading) return <div className="container py-12"><div className="h-40 bg-secondary rounded-sm animate-pulse" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="container py-12 animate-fade-in">
      <h1 className="text-3xl font-heading mb-8">Admin Dashboard</h1>
      <Tabs defaultValue="products">
        <TabsList className="mb-8">
          <TabsTrigger value="products" className="gap-2"><Package className="h-4 w-4" /> Products</TabsTrigger>
          <TabsTrigger value="orders" className="gap-2"><ShoppingCart className="h-4 w-4" /> Orders</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> Users</TabsTrigger>
        </TabsList>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProductsTab() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('products').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">{products.length} products</p>
        <ProductFormDialog />
      </div>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-secondary rounded-sm animate-pulse" />)}</div>
      ) : (
        <div className="border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50"><th className="text-left p-3 font-medium">Product</th><th className="text-left p-3 font-medium hidden md:table-cell">Category</th><th className="text-right p-3 font-medium">Price</th><th className="text-right p-3 font-medium hidden md:table-cell">Stock</th><th className="text-center p-3 font-medium">Active</th><th className="p-3"></th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-secondary rounded-sm overflow-hidden flex-shrink-0">
                        {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{p.category || '-'}</td>
                  <td className="p-3 text-right">${Number(p.price).toFixed(2)}</td>
                  <td className="p-3 text-right hidden md:table-cell">{p.stock}</td>
                  <td className="p-3 text-center"><Switch checked={p.is_active} onCheckedChange={v => toggleActive.mutate({ id: p.id, is_active: v })} /></td>
                  <td className="p-3"><ProductFormDialog product={p} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProductFormDialog({ product }: { product?: any }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    compare_at_price: product?.compare_at_price?.toString() || '',
    category: product?.category || '',
    stock: product?.stock?.toString() || '0',
    image_url: product?.image_url || '',
    is_active: product?.is_active ?? true,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        category: form.category || null,
        stock: parseInt(form.stock),
        image_url: form.image_url || null,
        is_active: form.is_active,
      };
      if (product) {
        const { error } = await supabase.from('products').update(data).eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(product ? 'Product updated' : 'Product created');
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? (
          <button className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
        ) : (
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{product ? 'Edit Product' : 'New Product'}</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
          <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Price</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Compare At</Label><Input type="number" step="0.01" value={form.compare_at_price} onChange={e => setForm({ ...form, compare_at_price: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            <div className="space-y-2"><Label>Stock</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Image URL</Label><Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} /></div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrdersTab() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data: ordersData, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
      if (error) throw error;
      // Fetch profiles for all unique user_ids
      const userIds = [...new Set((ordersData || []).map(o => o.user_id))];
      const { data: profilesData } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds);
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

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-secondary rounded-sm animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      {orders.map((order: any) => (
        <div key={order.id} className="border rounded-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">#{order.id.slice(0, 8)} · {format(new Date(order.created_at), 'MMM d, yyyy')}</p>
              <p className="text-sm">{order.profiles?.full_name || order.profiles?.email || 'Unknown'}</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={order.status} onValueChange={v => updateStatus.mutate({ id: order.id, status: v })}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm font-medium">${Number(order.total).toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{order.order_items?.length || 0} items</p>
        </div>
      ))}
      {orders.length === 0 && <p className="text-muted-foreground text-center py-8">No orders yet</p>}
    </div>
  );
}

function UsersTab() {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-secondary rounded-sm animate-pulse" />)}</div>;

  return (
    <div className="border rounded-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-muted/50"><th className="text-left p-3 font-medium">Name</th><th className="text-left p-3 font-medium">Email</th><th className="text-left p-3 font-medium hidden md:table-cell">Joined</th></tr></thead>
        <tbody>
          {profiles.map(p => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="p-3">{p.full_name || '-'}</td>
              <td className="p-3 text-muted-foreground">{p.email}</td>
              <td className="p-3 text-muted-foreground hidden md:table-cell">{format(new Date(p.created_at), 'MMM d, yyyy')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {profiles.length === 0 && <p className="text-center py-8 text-muted-foreground">No users yet</p>}
    </div>
  );
}
