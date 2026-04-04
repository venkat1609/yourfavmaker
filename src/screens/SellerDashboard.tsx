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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  Clock,
  XCircle,
  X,
  MessageSquare,
  GripVertical,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PaginationControls, usePagination } from '@/components/PaginationControls';
import { useCategories, useTags } from '@/hooks/useAdminData';
import type { Database } from '@/integrations/supabase/types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { SellerSidebar } from '@/components/SellerSidebar';
import { InventoryManager } from '@/components/InventoryManager';
import { SellerCollectionsManager, type SellerCollectionsManagerHandle } from '@/components/SellerCollectionsManager';
import type { ProductImageItem } from '@/lib/productImages';
import { createProductImageItemsFromFiles, reorderProductImageItems, revokeProductImageItems, resolveProductImageUrls } from '@/lib/productImages';
import { cn } from '@/lib/utils';

type StoreRow = Database['public']['Tables']['stores']['Row'];
type ProductRow = Database['public']['Tables']['products']['Row'];
type SellerSection = 'overview' | 'inventory' | 'collections' | 'products' | 'orders' | 'inquiries' | 'settings' | 'earnings' | 'payments';

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

type SellerPaymentHistoryItem = {
  id: string;
  created_at: string;
  total: number;
  status: string;
  razorpay_payment_id: string | null;
  product_count: number;
  item_count: number;
};

type StorePaymentRow = Database['public']['Tables']['store_payments']['Row'];

type SellerStoreFormState = {
  name: string;
  description: string;
  location: string;
  business_registration_number: string;
  pan: string;
};

type SellerPaymentsFormState = {
  bank_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  tax_id: string;
};

async function fetchSellerDashboardStats(storeIds: string[]): Promise<SellerStoreStats> {
  if (storeIds.length === 0) {
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
    .in('seller_id', storeIds);

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

async function fetchSellerPaymentHistory(sellerId: string): Promise<SellerPaymentHistoryItem[]> {
  const { data: storeProducts, error: productsError } = await supabase
    .from('products')
    .select('id')
    .eq('seller_id', sellerId);

  if (productsError) throw productsError;

  const productIds = (storeProducts || []).map(product => product.id);
  if (productIds.length === 0) return [];

  const { data: orderItems, error: orderItemsError } = await supabase
    .from('order_items')
    .select('order_id, quantity, product_id')
    .in('product_id', productIds);

  if (orderItemsError) throw orderItemsError;

  const orderIds = [...new Set((orderItems || []).map(item => item.order_id))];
  if (orderIds.length === 0) return [];

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, status, total, created_at, razorpay_payment_id')
    .in('id', orderIds)
    .order('created_at', { ascending: false });

  if (ordersError) throw ordersError;

  const summaryMap = new Map<string, SellerPaymentHistoryItem>();

  (orderItems || []).forEach(item => {
    const order = (orders || []).find(entry => entry.id === item.order_id);
    if (!order) return;

    const existing = summaryMap.get(order.id) || {
      id: order.id,
      created_at: order.created_at,
      total: Number(order.total),
      status: order.status,
      razorpay_payment_id: order.razorpay_payment_id,
      product_count: 0,
      item_count: 0,
    };

    existing.item_count += Number(item.quantity);
    existing.product_count += 1;
    summaryMap.set(order.id, existing);
  });

  return Array.from(summaryMap.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);
}

export default function SellerDashboard() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['my-stores', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StoreRow[];
    },
    enabled: !!user,
  });

  const selectedStoreId = searchParams?.get('store');
  const selectedStore = useMemo(() => {
    if (!selectedStoreId) return null;
    return stores.find(store => store.id === selectedStoreId) || null;
  }, [stores, selectedStoreId]);
  const activeSection = ((searchParams?.get('section') || 'overview') as SellerSection);

  if (storesLoading) return <div className="container py-12"><div className="h-40 bg-secondary rounded-sm animate-pulse" /></div>;

  if (!selectedStoreId) {
    return <SellerOverviewDashboard stores={stores} />;
  }

  if (!selectedStore) {
    return <SellerOverviewDashboard stores={stores} />;
  }

  return <SellerStoreDashboard seller={selectedStore} stores={stores} activeSection={activeSection} />;
}

function SellerStoreDashboard({ seller, stores, activeSection }: { seller: StoreRow; stores: StoreRow[]; activeSection: SellerSection }) {
  const queryClient = useQueryClient();
  const collectionsManagerRef = useRef<SellerCollectionsManagerHandle>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isInsideCollectionView, setIsInsideCollectionView] = useState(false);
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductRow | null>(null);
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
    { label: 'Active Orders', value: stats?.orderCount ?? '—' },
    { label: 'Units Sold', value: stats?.unitsSold ?? '—' },
    { label: 'Sales', value: stats ? `₹${stats.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—' },
  ];

  const tabContent = {
    overview: {
      title: 'Store Dashboard',
      description: 'Combined snapshot of your store performance, operations, and activity.',
    },
    inventory: {
      title: 'Inventory',
      description: 'Manage stock for products and variants separately from product details.',
    },
    collections: {
      title: 'Collections',
      description: 'Organize products into internal collections used only for store management.',
    },
    products: {
      title: 'Products',
      description: 'Create, search, reorder, and update products for this storefront.',
    },
    orders: {
      title: 'Orders',
      description: 'Track recent sales and fulfillment activity for this storefront.',
    },
    inquiries: {
      title: 'Inquiries',
      description: 'Messages from shoppers will appear here once the inbox is connected.',
    },
    settings: {
      title: 'Store Settings',
      description: 'Update the store identity, contact details, and address details.',
    },
    earnings: {
      title: 'Earnings',
      description: 'Review sales, payouts, and order performance for this storefront.',
    },
    payments: {
      title: 'Payments',
      description: 'Review bank and payout details for this storefront.',
    },
  } as const;

  const currentTab = tabContent[activeSection as keyof typeof tabContent] || tabContent.overview;

  return (
    <SidebarProvider>
      <div className="min-h-[calc(100vh-4rem)] flex w-full">
        <SellerSidebar stores={stores} activeStoreId={seller.id} activeSection={activeSection} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b px-4 gap-3">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground">
              {seller.status === 'approved' ? currentTab.title : seller.status}
            </span>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            <div className="animate-fade-in">
              {activeSection === 'settings' ? (
                <section className="space-y-6">
                  <SellerStoreSettingsForm seller={seller} />
                </section>
              ) : isApproved ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <div className="min-w-0 space-y-1">
                      <h1 className="text-2xl font-heading">{currentTab.title}</h1>
                      <p className="text-sm text-muted-foreground">{currentTab.description}</p>
                    </div>
                    <div className="flex min-w-[11rem] justify-end">
                      {activeSection === 'products' ? (
                        <SellerProductFormDialog sellerId={seller.id} />
                      ) : activeSection === 'collections' && !isInsideCollectionView ? (
                        <Button size="sm" onClick={() => collectionsManagerRef.current?.openCreateCollection()}>
                          <Plus className="h-4 w-4 mr-1" /> New Collection
                        </Button>
                      ) : activeSection === 'payments' ? (
                        <Button size="sm" variant="outline" onClick={() => setPaymentHistoryOpen(true)}>
                          View History
                        </Button>
                      ) : (
                        <div className="h-9 w-[11rem]" aria-hidden="true" />
                      )}
                    </div>
                  </div>

                  {activeSection === 'overview' && (
                    <section className="space-y-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                        {metricCards.map(card => (
                          <div key={card.label} className="border rounded-sm p-5 space-y-2">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">{card.label}</p>
                            <p className="text-2xl font-heading">{card.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid lg:grid-cols-2 gap-4">
                        <div className="border rounded-sm p-5 space-y-4">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Store Details</p>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Name</span>
                              <span className="font-medium text-right">{seller.name}</span>
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
                        <div className="border rounded-sm p-5 space-y-4">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Store Summary</p>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Products</span>
                              <span className="font-medium text-right">{stats?.productCount ?? '—'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Orders</span>
                              <span className="font-medium text-right">{stats?.orderCount ?? '—'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Units Sold</span>
                              <span className="font-medium text-right">{stats?.unitsSold ?? '—'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {activeSection === 'inventory' && (
                    <section className="space-y-6">
                      <InventoryManager scope="seller" sellerId={seller.id} />
                    </section>
                  )}

                  {activeSection === 'collections' && (
                    <section className="space-y-6">
                      <SellerCollectionsManager
                        sellerId={seller.id}
                        ref={collectionsManagerRef}
                        onSelectionChange={setIsInsideCollectionView}
                      />
                    </section>
                  )}

                  {activeSection === 'products' && (
                    <section className="space-y-6">
                      <div className="flex items-center gap-3">
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
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                            {pageProducts.map(p => (
                              <div key={p.id} className="border rounded-sm overflow-hidden bg-background">
                                <div className="relative aspect-[5/4] bg-secondary overflow-hidden">
                                  {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : null}
                                  <div className="absolute inset-x-0 bottom-0 p-3">
                                    <div className="flex items-end justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-[11px] text-black/60 truncate">{p.category || 'Uncategorized'}</p>
                                        <p className="font-medium text-black truncate">{p.name}</p>
                                      </div>
                                      <p className="text-sm font-medium whitespace-nowrap text-black">₹{Number(p.price).toFixed(2)}</p>
                                    </div>
                                  </div>
                                  <div className="absolute right-2 top-2 flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className={cn('h-6 w-6 bg-transparent hover:bg-transparent', p.is_active ? 'text-success' : 'text-muted-foreground')}
                                      onClick={() => toggleActive.mutate({ id: p.id, is_active: !p.is_active })}
                                      title={p.is_active ? 'Mark inactive' : 'Mark active'}
                                    >
                                      {p.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                    </Button>
                                    <SellerProductFormDialog sellerId={seller.id} product={p} />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 bg-transparent hover:bg-transparent text-destructive"
                                      onClick={() => setProductToDelete(p)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
                          </>
                      )}
                    </section>
                  )}

                  {activeSection === 'orders' && (
                    <section className="space-y-6">
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
                    </section>
                  )}

                  {activeSection === 'inquiries' && (
                    <section className="space-y-6">
                      <div className="border rounded-sm p-8 text-center">
                        <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="font-medium mb-2">No customer inbox yet</p>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          This section is ready for future customer messages, pre-sale questions, and support conversations.
                        </p>
                      </div>
                    </section>
                  )}

                  {activeSection === 'earnings' && (
                    <section className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="border rounded-sm p-5 space-y-2">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Sales</p>
                          <p className="text-2xl font-heading">{stats ? `₹${stats.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</p>
                        </div>
                        <div className="border rounded-sm p-5 space-y-2">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Units Sold</p>
                          <p className="text-2xl font-heading">{stats?.unitsSold ?? '—'}</p>
                        </div>
                        <div className="border rounded-sm p-5 space-y-2">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Orders</p>
                          <p className="text-2xl font-heading">{stats?.orderCount ?? '—'}</p>
                        </div>
                        <div className="border rounded-sm p-5 space-y-2">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending Orders</p>
                          <p className="text-2xl font-heading">{stats?.pendingOrderCount ?? '—'}</p>
                        </div>
                      </div>

                      <div className="border rounded-sm p-5 space-y-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Payout Summary</p>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Recent Orders</span>
                            <span className="font-medium text-right">{stats?.orderCount ?? '—'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Latest Payout</span>
                            <span className="font-medium text-right">—</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Payout Status</span>
                            <Badge variant="outline">Ready</Badge>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {activeSection === 'payments' && (
                    <section className="space-y-6">
                      <SellerPaymentsForm seller={seller} />
                    </section>
                  )}

                  <Dialog open={paymentHistoryOpen} onOpenChange={setPaymentHistoryOpen}>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Payment History</DialogTitle>
                      </DialogHeader>
                      <SellerPaymentHistory sellerId={seller.id} />
                    </DialogContent>
                  </Dialog>

                  <AlertDialog
                    open={Boolean(productToDelete)}
                    onOpenChange={(open) => {
                      if (!open) setProductToDelete(null);
                    }}
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete product?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{productToDelete?.name}" and cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            if (!productToDelete) return;
                            deleteMutation.mutate(productToDelete.id);
                            setProductToDelete(null);
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="max-w-lg border rounded-sm p-8">
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

function SellerStoreSettingsForm({ seller }: { seller: StoreRow }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SellerStoreFormState>({
    name: seller.name || '',
    description: seller.description || '',
    location: seller.location || '',
    business_registration_number: seller.business_registration_number || '',
    pan: seller.pan || '',
  });

  useEffect(() => {
    setForm({
      name: seller.name || '',
      description: seller.description || '',
      location: seller.location || '',
      business_registration_number: seller.business_registration_number || '',
      pan: seller.pan || '',
    });
  }, [seller]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('stores')
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          location: form.location.trim() || null,
          business_registration_number: form.business_registration_number.trim() || null,
          pan: form.pan.trim() || null,
        })
        .eq('id', seller.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-stores', seller.user_id] });
      queryClient.invalidateQueries({ queryKey: ['seller-products', seller.id] });
      queryClient.invalidateQueries({ queryKey: ['seller-dashboard-stats', seller.id] });
      toast.success('Store updated');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update store');
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="border rounded-sm p-4 space-y-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Store Information</p>
        <div className="space-y-3">
          <Label>Store Name *</Label>
          <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
        </div>
        <div className="space-y-3">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={3} />
        </div>
        <div className="space-y-3">
          <Label>Location *</Label>
          <Input value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Label>GSTIN *</Label>
            <Input
              value={form.business_registration_number}
              onChange={(e) => setForm((prev) => ({ ...prev, business_registration_number: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-3">
            <Label>PAN *</Label>
            <Input value={form.pan} onChange={(e) => setForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))} />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={
          mutation.isPending ||
          !form.name.trim() ||
          !form.location.trim() ||
          !form.business_registration_number.trim() ||
          !form.pan.trim()
        }
      >
        {mutation.isPending ? 'Saving...' : 'Save Store'}
      </Button>
    </form>
  );
}

function SellerPaymentsForm({ seller }: { seller: StoreRow }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SellerPaymentsFormState>({
    bank_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    tax_id: '',
  });
  const { data: payment, isLoading: paymentLoading } = useQuery({
    queryKey: ['store-payments', seller.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_payments')
        .select('*')
        .eq('store_id', seller.id)
        .maybeSingle();
      if (error) throw error;
      return data as StorePaymentRow | null;
    },
  });

  useEffect(() => {
    setForm({
      bank_name: payment?.bank_name || '',
      bank_account_number: payment?.bank_account_number || '',
      bank_ifsc: payment?.bank_ifsc || '',
      tax_id: payment?.tax_id || '',
    });
  }, [payment]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('store_payments')
        .upsert(
          {
            store_id: seller.id,
            bank_name: form.bank_name.trim() || null,
            bank_account_number: form.bank_account_number.trim() || null,
            bank_ifsc: form.bank_ifsc.trim() || null,
            tax_id: form.tax_id.trim() || null,
          },
          { onConflict: 'store_id' },
        )
        .select('id');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-payments', seller.id] });
      queryClient.invalidateQueries({ queryKey: ['seller-dashboard-stats', seller.id] });
      toast.success('Payment details updated');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update payment details');
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Bank Name *</Label>
          <Input
            value={form.bank_name}
            onChange={e => setForm(prev => ({ ...prev, bank_name: e.target.value }))}
            disabled={paymentLoading || mutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label>Account Number *</Label>
          <Input
            value={form.bank_account_number}
            onChange={e => setForm(prev => ({ ...prev, bank_account_number: e.target.value }))}
            disabled={paymentLoading || mutation.isPending}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>IFSC Code *</Label>
          <Input
            value={form.bank_ifsc}
            onChange={e => setForm(prev => ({ ...prev, bank_ifsc: e.target.value }))}
            disabled={paymentLoading || mutation.isPending}
          />
        </div>
        <div className="space-y-2">
          <Label>Tax ID / GSTIN *</Label>
          <Input
            value={form.tax_id}
            onChange={e => setForm(prev => ({ ...prev, tax_id: e.target.value }))}
            disabled={paymentLoading || mutation.isPending}
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={
          mutation.isPending ||
          paymentLoading ||
          !form.bank_name.trim() ||
          !form.bank_account_number.trim() ||
          !form.bank_ifsc.trim() ||
          !form.tax_id.trim()
        }
      >
        {mutation.isPending ? 'Saving...' : 'Save Payment Details'}
      </Button>
    </form>
  );
}

function SellerPaymentHistory({ sellerId }: { sellerId: string }) {
  const { data: paymentHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['seller-payment-history', sellerId],
    queryFn: () => fetchSellerPaymentHistory(sellerId),
  });

  return (
    <div className="space-y-4">
      {historyLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-12 rounded-sm bg-secondary animate-pulse" />
          ))}
        </div>
      ) : paymentHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payment history yet.</p>
      ) : (
        <div className="space-y-2">
          {paymentHistory.map((entry) => (
            <div key={entry.id} className="grid gap-3 rounded-sm border px-3 py-2 text-sm md:grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr_1fr] md:items-center">
              <div className="min-w-0">
                <p className="font-medium truncate">Order #{entry.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleDateString()}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Amount</p>
                <p className="font-medium">₹{entry.total.toFixed(2)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Items</p>
                <p className="font-medium">{entry.item_count}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Payment ID</p>
                <p className="font-mono text-xs text-muted-foreground truncate">{entry.razorpay_payment_id || 'Pending'}</p>
              </div>
              <div className="min-w-0 md:text-right">
                <Badge variant="outline" className="capitalize">
                  {entry.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SellerOverviewDashboard({ stores }: { stores: StoreRow[] }) {
  const storeIds = useMemo(() => stores.map(store => store.id), [stores]);
  const { data: stats } = useQuery({
    queryKey: ['seller-dashboard-stats', 'overview', storeIds],
    enabled: storeIds.length > 0,
    queryFn: async () => fetchSellerDashboardStats(storeIds),
  });

  const metricCards = [
    {
      label: 'Active Products',
      value: stats
        ? `${stats.activeProductCount} / ${stats.productCount}`
        : '—',
    },
    { label: 'Active Orders', value: stats?.orderCount ?? '—' },
    { label: 'Units Sold', value: stats?.unitsSold ?? '—' },
    { label: 'Sales', value: stats ? `₹${stats.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—' },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-[calc(100vh-4rem)] flex w-full">
        <SellerSidebar stores={stores} activeStoreId={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b px-4 gap-3">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground">Overview</span>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
          <div className="animate-fade-in">
            {stores.length === 0 ? (
              <div className="border rounded-sm px-6 py-8 space-y-4 text-center w-full">
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
                  You haven't created any storefronts yet. Start by adding your first store to begin listing products.
                </p>
                <Button asChild size="sm" className="mx-auto">
                  <Link href="/seller/register">Create Store</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                      {stores.map(store => (
                        <Link
                          key={store.id}
                          href={`/seller/dashboard?store=${encodeURIComponent(store.id)}`}
                          className="flex items-center justify-between gap-3 rounded-sm border px-3 py-2 text-sm hover:bg-accent/40 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{store.name}</p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'capitalize',
                              store.status === 'approved' && 'border-success/30 text-success',
                              store.status === 'pending' && 'border-accent/30 text-accent',
                              store.status === 'rejected' && 'border-destructive/30 text-destructive',
                            )}
                          >
                            {store.status}
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
              </>
            )}
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const [isUploadTileActive, setIsUploadTileActive] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    compare_at_price: product?.compare_at_price?.toString() || '',
    category: product?.category || '',
    collection_id: product?.collection_id || '',
    tags: (product?.tags as string[]) || [],
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

  useEffect(() => {
    if (!open) {
      setDraggedImageId(null);
      setDragOverImageId(null);
      setIsUploadTileActive(false);
    }
  }, [open]);

  const moveImage = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setImages(prev => {
      const fromIndex = prev.findIndex(item => item.id === fromId);
      const toIndex = prev.findIndex(item => item.id === toId);
      return reorderProductImageItems(prev, fromIndex, toIndex);
    });
  };

  const appendImagesFromFiles = (files: File[]) => {
    if (files.length === 0) return;
    syncImages(prev => [...prev, ...createProductImageItemsFromFiles(files)]);
  };

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const { data: collections = [] } = useQuery({
    queryKey: ['seller-collections', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase.from('collections').select('id, name').eq('seller_id', sellerId).order('name');
      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
  });

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
        collection_id: form.collection_id || null,
        tags: form.tags,
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
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Collection</Label>
            <Select value={form.collection_id || 'none'} onValueChange={v => setForm({ ...form, collection_id: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No collection</SelectItem>
                {collections.map(collection => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Internal only. Used for store organization.</p>
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                appendImagesFromFiles(Array.from(e.target.files || []));
                e.currentTarget.value = '';
              }}
            />
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={event => {
                    event.preventDefault();
                    setIsUploadTileActive(true);
                  }}
                  onDragLeave={event => {
                    setIsUploadTileActive(false);
                  }}
                  onDrop={event => {
                    event.preventDefault();
                    setIsUploadTileActive(false);
                    appendImagesFromFiles(Array.from(event.dataTransfer.files || []).filter(file => file.type.startsWith('image/')));
                  }}
                  className={cn(
                    'group relative flex aspect-square h-full w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-sm border border-dashed bg-secondary/40 p-4 text-center transition-all duration-200',
                    'hover:border-primary/40 hover:bg-secondary/70',
                    isUploadTileActive && 'border-primary/60 bg-secondary/80 ring-2 ring-primary ring-offset-2 shadow-md scale-[0.99]',
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-sm border bg-background shadow-sm transition-transform group-hover:scale-105">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Upload images</p>
                    <p className="text-xs text-muted-foreground">Click or drop files</p>
                  </div>
                </button>
                {images.map((image, index) => (
                    <div
                      key={image.id}
                      draggable
                      onDragStart={() => setDraggedImageId(image.id)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (draggedImageId && draggedImageId !== image.id) {
                          setDragOverImageId(image.id);
                        }
                      }}
                      onDragLeave={() => setDragOverImageId(current => (current === image.id ? null : current))}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedImageId) {
                          moveImage(draggedImageId, image.id);
                        }
                        setDraggedImageId(null);
                        setDragOverImageId(null);
                      }}
                      onDragEnd={() => {
                        setDraggedImageId(null);
                        setDragOverImageId(null);
                      }}
                      className={cn(
                        'group relative overflow-hidden rounded-sm border bg-secondary transition-all duration-200',
                        draggedImageId === image.id && 'scale-[0.98] opacity-60',
                        dragOverImageId === image.id && 'ring-2 ring-primary ring-offset-2',
                      )}
                    >
                      <img src={image.previewUrl} alt={`Product image ${index + 1}`} className="aspect-square h-full w-full object-cover" />
                      {index === 0 && (
                        <div className="absolute left-1 top-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                          Primary
                        </div>
                      )}
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-1 text-foreground shadow opacity-0 transition-opacity group-hover:opacity-100">
                        <GripVertical className="h-3 w-3" />
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
