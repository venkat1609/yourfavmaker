"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Package, Clock, XCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { PaginationControls, usePagination } from '@/components/PaginationControls';
import { useCategories, useTags } from '@/hooks/useAdminData';
import type { Database } from '@/integrations/supabase/types';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { SellerSidebar } from '@/components/SellerSidebar';
import type { ProductImageItem } from '@/lib/productImages';
import { createProductImageItemsFromFiles, revokeProductImageItems, resolveProductImageUrls } from '@/lib/productImages';
import { cn } from '@/lib/utils';

type SellerRow = Database['public']['Tables']['sellers']['Row'];
type ProductRow = Database['public']['Tables']['products']['Row'];

type SellerStoreStats = {
  productCount: number;
  activeProductCount: number;
  orderCount: number;
  pendingOrderCount: number;
  unitsSold: number;
  revenue: number;
  recentOrders: Array<{
    id: string;
    status: string;
    created_at: string;
    total: number;
    revenue: number;
    items: number;
  }>;
};

type SellerStoreFormState = {
  name: string;
  slug: string;
  description: string;
  phone: string;
  logo_url: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  bank_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  tax_id: string;
};

const generateStoreSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function fetchSellerDashboardStats(sellerIds: string[]): Promise<SellerStoreStats> {
  if (sellerIds.length === 0) {
    return {
      productCount: 0,
      activeProductCount: 0,
      orderCount: 0,
      pendingOrderCount: 0,
      unitsSold: 0,
      revenue: 0,
      recentOrders: [],
    };
  }

  const { data: storeProducts, error: productsError } = await supabase
    .from('products')
    .select('id, is_active')
    .in('seller_id', sellerIds);

  if (productsError) throw productsError;

  const productRows = storeProducts || [];
  const productIds = productRows.map(product => product.id);

  if (productIds.length === 0) {
    return {
      productCount: 0,
      activeProductCount: 0,
      orderCount: 0,
      pendingOrderCount: 0,
      unitsSold: 0,
      revenue: 0,
      recentOrders: [],
    };
  }

  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select('order_id, quantity, price')
    .in('product_id', productIds);

  if (orderItemsError) throw orderItemsError;

  const orderIds = [...new Set((orderItems || []).map(item => item.order_id))];

  if (orderIds.length === 0) {
    return {
      productCount: productRows.length,
      activeProductCount: productRows.filter(product => product.is_active).length,
      orderCount: 0,
      pendingOrderCount: 0,
      unitsSold: 0,
      revenue: 0,
      recentOrders: [],
    };
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, status, total, created_at')
    .in('id', orderIds)
    .order('created_at', { ascending: false });

  if (ordersError) throw ordersError;

  const orderMap = new Map((orders || []).map(order => [order.id, order]));
  const summaryMap = new Map<string, SellerStoreStats['recentOrders'][number]>();

  let unitsSold = 0;
  let revenue = 0;

  (orderItems || []).forEach(item => {
    unitsSold += Number(item.quantity);
    revenue += Number(item.price) * Number(item.quantity);

    const order = orderMap.get(item.order_id);
    if (!order) return;

    const current = summaryMap.get(item.order_id) || {
      id: order.id,
      status: order.status,
      created_at: order.created_at,
      total: Number(order.total),
      revenue: 0,
      items: 0,
    };

    current.revenue += Number(item.price) * Number(item.quantity);
    current.items += Number(item.quantity);
    summaryMap.set(item.order_id, current);
  });

  return {
    productCount: productRows.length,
    activeProductCount: productRows.filter(product => product.is_active).length,
    orderCount: orderIds.length,
    pendingOrderCount: (orders || []).filter(order => order.status === 'pending').length,
    unitsSold,
    revenue,
    recentOrders: Array.from(summaryMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5),
  };
}

export default function SellerDashboard() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const { data: sellers = [], isLoading: sellersLoading } = useQuery({
    queryKey: ['my-sellers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('sellers').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data as SellerRow[];
    },
    enabled: !!user,
  });

  const selectedStoreSlug = searchParams.get('store');
  const selectedSeller = useMemo(() => {
    if (!selectedStoreSlug) return null;
    return sellers.find(store => store.slug === selectedStoreSlug) || null;
  }, [sellers, selectedStoreSlug]);

  if (sellersLoading) return <div className="container py-12"><div className="h-40 bg-secondary rounded-sm animate-pulse" /></div>;

  if (sellers.length === 0) {
    return (
      <div className="container max-w-lg py-20 text-center animate-fade-in">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-heading mb-3">No Seller Account</h1>
        <p className="text-muted-foreground mb-6">You haven't created any stores yet.</p>
        <Button asChild><Link href="/seller/register">Create Store</Link></Button>
      </div>
    );
  }

  if (!selectedStoreSlug) {
    return <SellerOverviewDashboard sellers={sellers} />;
  }

  if (!selectedSeller) {
    return <SellerOverviewDashboard sellers={sellers} />;
  }

  return <SellerStoreDashboard seller={selectedSeller} sellers={sellers} />;
}

function SellerStoreDashboard({ seller, sellers }: { seller: SellerRow; sellers: SellerRow[] }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const ITEMS_PER_PAGE = 10;

  const isApproved = seller.status === 'approved';

  useEffect(() => {
    setPage(1);
    setSearch('');
  }, [seller.id]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['seller-products', seller.id],
    enabled: isApproved,
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('seller_id', seller.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('products').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['seller-dashboard-stats', seller.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('product_attributes').delete().eq('product_id', id);
      await supabase.from('product_variants').delete().eq('product_id', id);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['seller-dashboard-stats', seller.id] });
      toast.success('Product deleted');
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const { totalPages, getPageItems } = usePagination(filtered, ITEMS_PER_PAGE);
  const pageProducts = getPageItems(page);

  const { data: stats } = useQuery({
    queryKey: ['seller-dashboard-stats', seller.id],
    enabled: isApproved,
    queryFn: async () => fetchSellerDashboardStats([seller.id]),
  });

  const metricCards = [
    { label: 'Active Products', value: stats?.activeProductCount ?? '—' },
    { label: 'Pending Orders', value: stats?.pendingOrderCount ?? '—' },
    { label: 'Units Sold', value: stats?.unitsSold ?? '—' },
    { label: 'Sales', value: stats ? `₹${stats.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—' },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-[calc(100vh-4rem)] flex w-full">
        <SellerSidebar sellers={sellers} activeSellerSlug={seller.slug} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b px-4 gap-3">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground">
              {seller.status === 'approved' ? 'Overview' : seller.status}
            </span>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-heading">Store Dashboard</h1>
                <div className="flex items-center gap-2">
                  <SellerStoreEditDialog seller={seller} onSaved={(updatedSlug) => {
                    if (updatedSlug) {
                      router.replace(`/seller/dashboard?store=${encodeURIComponent(updatedSlug)}`);
                    }
                    queryClient.invalidateQueries({ queryKey: ['my-sellers', seller.user_id] });
                  }} />
                  {isApproved && <SellerProductFormDialog sellerId={seller.id} />}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Overview for <strong>{seller.name}</strong> · <span className="font-medium">{seller.slug}</span>
              </p>

              {isApproved ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
                    {metricCards.map(card => (
                      <div key={card.label} className="border rounded-sm p-5 space-y-2">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{card.label}</p>
                        <p className="text-2xl font-heading">{card.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid lg:grid-cols-2 gap-4 mb-8">
                    <div className="border rounded-sm p-5 space-y-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Store Details</p>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Name</span>
                          <span className="font-medium text-right">{seller.name}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Slug</span>
                          <span className="font-medium text-right">{seller.slug}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant="outline" className={cn(
                            'capitalize',
                            seller.status === 'approved' && 'border-success/30 text-success',
                            seller.status === 'pending' && 'border-accent/30 text-accent',
                            seller.status === 'rejected' && 'border-destructive/30 text-destructive',
                          )}>
                            {seller.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="border rounded-sm p-5">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Recent Orders</p>
                      {stats?.recentOrders.length ? (
                        <div className="space-y-3">
                          {stats.recentOrders.map(order => (
                            <div key={order.id} className="flex items-center justify-between gap-3 text-sm">
                              <div>
                                <p className="font-medium">#{order.id.slice(0, 8)}</p>
                                <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">₹{order.revenue.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground capitalize">{order.status}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No orders yet for this store.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-lg font-heading">Manage Products</h2>
                      <p className="text-sm text-muted-foreground">Create, search, reorder, and update products for this storefront.</p>
                    </div>
                    <Badge variant="outline">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</Badge>
                  </div>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search your products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-secondary rounded-sm animate-pulse" />)}</div>
                  ) : products.length === 0 ? (
                    <div className="border rounded-sm p-12 text-center">
                      <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground mb-4">You haven't added any products yet.</p>
                      <SellerProductFormDialog sellerId={seller.id} />
                    </div>
                  ) : (
                    <>
                      <div className="border rounded-sm overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium">Product</th>
                              <th className="text-left p-3 font-medium hidden md:table-cell">Category</th>
                              <th className="text-right p-3 font-medium">Price</th>
                              <th className="text-right p-3 font-medium hidden md:table-cell">Stock</th>
                              <th className="text-center p-3 font-medium">Active</th>
                              <th className="p-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageProducts.map(p => (
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
                                <td className="p-3 text-right">₹{Number(p.price).toFixed(2)}</td>
                                <td className="p-3 text-right hidden md:table-cell">{p.stock}</td>
                                <td className="p-3 text-center">
                                  <Switch checked={p.is_active} onCheckedChange={v => toggleActive.mutate({ id: p.id, is_active: v })} />
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center justify-end gap-1">
                                    <SellerProductFormDialog sellerId={seller.id} product={p} />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(p.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
                    </>
                  )}
                </>
              ) : (
                <div className="max-w-lg border rounded-sm p-8">
                  <div className="mb-4">
                    <SellerStoreEditDialog
                      seller={seller}
                      onSaved={(updatedSlug) => {
                        if (updatedSlug) {
                          router.replace(`/seller/dashboard?store=${encodeURIComponent(updatedSlug)}`);
                        }
                        queryClient.invalidateQueries({ queryKey: ['my-sellers', seller.user_id] });
                      }}
                      triggerLabel="Edit Store Info"
                      triggerClassName="w-full"
                    />
                  </div>
                  {seller.status === 'pending' ? (
                    <>
                      <Clock className="h-12 w-12 text-accent mb-4" />
                      <h2 className="text-xl font-heading mb-2">Store Pending</h2>
                      <p className="text-sm text-muted-foreground mb-2">Your store <strong>{seller.name}</strong> is under review.</p>
                      <p className="text-sm text-muted-foreground">You can switch to another storefront from the sidebar if you have one approved.</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-12 w-12 text-destructive mb-4" />
                      <h2 className="text-xl font-heading mb-2">Store Rejected</h2>
                      <p className="text-sm text-muted-foreground mb-2">Your store <strong>{seller.name}</strong> was not approved.</p>
                      <p className="text-sm text-muted-foreground">Create another storefront from the sidebar if needed.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function SellerStoreEditDialog({
  seller,
  onSaved,
  triggerLabel = 'Edit Store',
  triggerClassName,
}: {
  seller: SellerRow;
  onSaved?: (updatedSlug?: string) => void;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SellerStoreFormState>({
    name: seller.name || '',
    slug: seller.slug || '',
    description: seller.description || '',
    phone: seller.phone || '',
    logo_url: seller.logo_url || '',
    address_street: seller.address_street || '',
    address_city: seller.address_city || '',
    address_state: seller.address_state || '',
    address_zip: seller.address_zip || '',
    address_country: seller.address_country || 'IN',
    bank_name: seller.bank_name || '',
    bank_account_number: seller.bank_account_number || '',
    bank_ifsc: seller.bank_ifsc || '',
    tax_id: seller.tax_id || '',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: seller.name || '',
      slug: seller.slug || '',
      description: seller.description || '',
      phone: seller.phone || '',
      logo_url: seller.logo_url || '',
      address_street: seller.address_street || '',
      address_city: seller.address_city || '',
      address_state: seller.address_state || '',
      address_zip: seller.address_zip || '',
      address_country: seller.address_country || 'IN',
      bank_name: seller.bank_name || '',
      bank_account_number: seller.bank_account_number || '',
      bank_ifsc: seller.bank_ifsc || '',
      tax_id: seller.tax_id || '',
    });
  }, [open, seller]);

  const mutation = useMutation({
    mutationFn: async () => {
      const slug = generateStoreSlug(form.slug.trim() || form.name);
      const { data, error } = await supabase
        .from('sellers')
        .update({
          name: form.name.trim(),
          slug,
          description: form.description.trim() || null,
          phone: form.phone.trim() || null,
          logo_url: form.logo_url.trim() || null,
          address_street: form.address_street.trim() || null,
          address_city: form.address_city.trim() || null,
          address_state: form.address_state.trim() || null,
          address_zip: form.address_zip.trim() || null,
          address_country: form.address_country.trim() || null,
          bank_name: form.bank_name.trim() || null,
          bank_account_number: form.bank_account_number.trim() || null,
          bank_ifsc: form.bank_ifsc.trim() || null,
          tax_id: form.tax_id.trim() || null,
        })
        .eq('id', seller.id)
        .select('slug')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-sellers', seller.user_id] });
      queryClient.invalidateQueries({ queryKey: ['seller-products', seller.id] });
      queryClient.invalidateQueries({ queryKey: ['seller-dashboard-stats', seller.id] });
      toast.success('Store updated');
      setOpen(false);
      onSaved?.(data?.slug || generateStoreSlug(form.slug.trim() || form.name));
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update store');
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClassName}>
          <Pencil className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Store Information</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Store Name *</Label>
              <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value, slug: prev.slug || generateStoreSlug(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Store Slug *</Label>
              <Input value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))} />
              <p className="text-xs text-muted-foreground">This updates the storefront URL and dashboard store selector. Store name and slug must be unique.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={form.logo_url} onChange={e => setForm(prev => ({ ...prev, logo_url: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Street Address *</Label>
            <Input value={form.address_street} onChange={e => setForm(prev => ({ ...prev, address_street: e.target.value }))} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={form.address_city} onChange={e => setForm(prev => ({ ...prev, address_city: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Input value={form.address_state} onChange={e => setForm(prev => ({ ...prev, address_state: e.target.value }))} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>ZIP Code *</Label>
              <Input value={form.address_zip} onChange={e => setForm(prev => ({ ...prev, address_zip: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={form.address_country} onChange={e => setForm(prev => ({ ...prev, address_country: e.target.value }))} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Bank Name *</Label>
              <Input value={form.bank_name} onChange={e => setForm(prev => ({ ...prev, bank_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Account Number *</Label>
              <Input value={form.bank_account_number} onChange={e => setForm(prev => ({ ...prev, bank_account_number: e.target.value }))} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>IFSC Code *</Label>
              <Input value={form.bank_ifsc} onChange={e => setForm(prev => ({ ...prev, bank_ifsc: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tax ID / GSTIN *</Label>
              <Input value={form.tax_id} onChange={e => setForm(prev => ({ ...prev, tax_id: e.target.value }))} />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              !form.name.trim() ||
              !form.slug.trim() ||
              !form.phone.trim() ||
              !form.address_street.trim() ||
              !form.address_city.trim() ||
              !form.address_state.trim() ||
              !form.address_zip.trim() ||
              !form.bank_name.trim() ||
              !form.bank_account_number.trim() ||
              !form.bank_ifsc.trim() ||
              !form.tax_id.trim()
            }
          >
            {mutation.isPending ? 'Saving...' : 'Save Store'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SellerOverviewDashboard({ sellers }: { sellers: SellerRow[] }) {
  const { data: stats } = useQuery({
    queryKey: ['seller-dashboard-stats', 'overview', sellers.map(seller => seller.id)],
    enabled: sellers.length > 0,
    queryFn: async () => fetchSellerDashboardStats(sellers.map(seller => seller.id)),
  });

  const metricCards = [
    { label: 'Stores', value: sellers.length },
    { label: 'Total Products', value: stats?.productCount ?? '—' },
    { label: 'Active Products', value: stats?.activeProductCount ?? '—' },
    { label: 'Pending Orders', value: stats?.pendingOrderCount ?? '—' },
    { label: 'Units Sold', value: stats?.unitsSold ?? '—' },
    { label: 'Sales', value: stats ? `₹${stats.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—' },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-[calc(100vh-4rem)] flex w-full">
        <SellerSidebar sellers={sellers} activeSellerSlug={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b px-4 gap-3">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground">Overview</span>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-heading">Store Overview</h1>
                <Button asChild size="sm">
                  <Link href="/seller/register">Create Store</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Combined snapshot across <strong>{sellers.length}</strong> storefront{sellers.length !== 1 ? 's' : ''}.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-8">
                {metricCards.map(card => (
                  <div key={card.label} className="border rounded-sm p-5 space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-heading">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="border rounded-sm p-5 space-y-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Storefronts</p>
                  <div className="space-y-3">
                    {sellers.map(seller => (
                      <Link
                        key={seller.id}
                        href={`/seller/dashboard?store=${encodeURIComponent(seller.slug)}`}
                        className="flex items-center justify-between gap-3 rounded-sm border px-3 py-2 text-sm hover:bg-accent/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{seller.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{seller.slug}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'capitalize',
                            seller.status === 'approved' && 'border-success/30 text-success',
                            seller.status === 'pending' && 'border-accent/30 text-accent',
                            seller.status === 'rejected' && 'border-destructive/30 text-destructive',
                          )}
                        >
                          {seller.status}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="border rounded-sm p-5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Recent Orders</p>
                  {stats?.recentOrders.length ? (
                    <div className="space-y-3">
                      {stats.recentOrders.map(order => (
                        <div key={order.id} className="flex items-center justify-between gap-3 text-sm">
                          <div>
                            <p className="font-medium">#{order.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{order.revenue.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground capitalize">{order.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No orders yet across your stores.</p>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function SellerProductFormDialog({ sellerId, product }: { sellerId: string; product?: ProductRow }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const imagesRef = useRef<ProductImageItem[]>([]);
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    compare_at_price: product?.compare_at_price?.toString() || '',
    category: product?.category || '',
    tags: (product?.tags as string[]) || [],
    stock: product?.stock?.toString() || '0',
    is_active: product?.is_active ?? true,
  });
  const initialProductImageUrls = useMemo(() => {
    const urls = (product?.image_urls || []).filter(Boolean);
    if (urls.length > 0) return urls;
    return product?.image_url ? [product.image_url] : [];
  }, [product]);
  const initialImages = useMemo<ProductImageItem[]>(
    () => initialProductImageUrls.map((url, index) => ({
      id: `${product?.id || 'new'}-${index}`,
      kind: 'existing' as const,
      previewUrl: url,
    })),
    [initialProductImageUrls, product?.id],
  );

  const syncImages = (next: ProductImageItem[] | ((prev: ProductImageItem[]) => ProductImageItem[])) => {
    setImages((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      return resolved;
    });
  };

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    if (open) {
      setImages(initialImages);
      return;
    }
    setImages(prev => {
      revokeProductImageItems(prev);
      return [];
    });
  }, [open, initialImages]);

  useEffect(() => () => revokeProductImageItems(imagesRef.current), []);

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const mutation = useMutation({
    mutationFn: async () => {
      const imageUrls = await resolveProductImageUrls(images);
      if (!product && imageUrls.length === 0) {
        throw new Error('Please upload at least one product image');
      }
      const data = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        category: form.category || null,
        tags: form.tags,
        stock: parseInt(form.stock),
        image_url: imageUrls[0] || null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        is_active: form.is_active,
        seller_id: sellerId,
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
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['seller-dashboard-stats', sellerId] });
      toast.success(product ? 'Product updated' : 'Product created');
      revokeProductImageItems(imagesRef.current);
      setImages([]);
      setOpen(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Something went wrong'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? (
          <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{product ? 'Edit Product' : 'New Product'}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Price *</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
            <div className="space-y-2"><Label>Compare At</Label><Input type="number" step="0.01" value={form.compare_at_price} onChange={e => setForm({ ...form, compare_at_price: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Stock</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <label key={tag.id} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={form.tags.includes(tag.name)} onCheckedChange={(checked) => setForm(prev => ({ ...prev, tags: checked ? [...prev.tags, tag.name] : prev.tags.filter(t => t !== tag.name) }))} />
                  <span className="text-sm">{tag.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Product Images</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={e => {
                const files = Array.from(e.target.files || []);
                if (files.length > 0) {
                  syncImages(prev => [...prev, ...createProductImageItemsFromFiles(files)]);
                }
                e.currentTarget.value = '';
              }}
            />
            <p className="text-xs text-muted-foreground">
              {product
                ? 'Reorder images with the arrows. The first image becomes the primary image.'
                : 'Upload one or more images for the product gallery.'}
            </p>
            {images.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Gallery Order</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {images.map((image, index) => (
                    <div key={image.id} className="relative overflow-hidden rounded-sm border bg-secondary">
                      <img src={image.previewUrl} alt={`Product image ${index + 1}`} className="aspect-square h-full w-full object-cover" />
                      {index === 0 && (
                        <div className="absolute left-1 top-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                          Primary
                        </div>
                      )}
                      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => syncImages(prev => {
                            if (index === 0) return prev;
                            const next = [...prev];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            return next;
                          })}
                          disabled={index === 0}
                          className="rounded-full bg-background/90 p-1 text-foreground shadow disabled:opacity-40"
                          aria-label={`Move image ${index + 1} left`}
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => syncImages(prev => {
                            if (index === prev.length - 1) return prev;
                            const next = [...prev];
                            [next[index + 1], next[index]] = [next[index], next[index + 1]];
                            return next;
                          })}
                          disabled={index === images.length - 1}
                          className="rounded-full bg-background/90 p-1 text-foreground shadow disabled:opacity-40"
                          aria-label={`Move image ${index + 1} right`}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => syncImages(prev => {
                          const item = prev[index];
                          if (item?.kind === 'new') {
                            URL.revokeObjectURL(item.previewUrl);
                          }
                          return prev.filter((_, i) => i !== index);
                        })}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow hover:bg-background"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.name.trim() || !form.price || mutation.isPending || (!product && images.length === 0)}
            className="w-full"
          >
            {mutation.isPending ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
