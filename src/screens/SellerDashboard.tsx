"use client";

import { useState, useEffect, useMemo } from 'react';
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
import { Plus, Pencil, Trash2, Search, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { PaginationControls, usePagination } from '@/components/PaginationControls';
import { useCategories, useTags } from '@/hooks/useAdminData';
import Link from 'next/link';

export default function SellerDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: seller, isLoading: sellerLoading } = useQuery({
    queryKey: ['my-seller', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('sellers').select('*').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (sellerLoading) return <div className="container py-12"><div className="h-40 bg-secondary rounded-sm animate-pulse" /></div>;

  if (!seller) {
    return (
      <div className="container max-w-lg py-20 text-center animate-fade-in">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-heading mb-3">No Seller Account</h1>
        <p className="text-muted-foreground mb-6">You haven't registered as a seller yet.</p>
        <Button asChild><Link href="/seller/register">Become a Seller</Link></Button>
      </div>
    );
  }

  if (seller.status === 'pending') {
    return (
      <div className="container max-w-lg py-20 text-center animate-fade-in">
        <Clock className="h-12 w-12 mx-auto text-accent mb-4" />
        <h1 className="text-2xl font-heading mb-3">Application Under Review</h1>
        <p className="text-muted-foreground mb-2">Your seller application for <strong>{seller.name}</strong> is being reviewed.</p>
        <p className="text-sm text-muted-foreground">We'll notify you once it's approved. This usually takes 1-2 business days.</p>
      </div>
    );
  }

  if (seller.status === 'rejected') {
    return (
      <div className="container max-w-lg py-20 text-center animate-fade-in">
        <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h1 className="text-2xl font-heading mb-3">Application Rejected</h1>
        <p className="text-muted-foreground mb-6">Unfortunately, your seller application was not approved. Please contact support for more information.</p>
        <Button asChild variant="outline"><Link href="/">Back to Home</Link></Button>
      </div>
    );
  }

  return <SellerProducts seller={seller} />;
}

function SellerProducts({ seller }: { seller: any }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const ITEMS_PER_PAGE = 10;

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['seller-products', seller.id],
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seller-products'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('product_attributes').delete().eq('product_id', id);
      await supabase.from('product_variants').delete().eq('product_id', id);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['seller-products'] }); toast.success('Product deleted'); },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const { totalPages, getPageItems } = usePagination(filtered, ITEMS_PER_PAGE);
  const pageProducts = getPageItems(page);

  return (
    <div className="container py-12 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-heading">Seller Dashboard</h1>
        <SellerProductFormDialog sellerId={seller.id} />
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Managing products for <strong>{seller.name}</strong> · <Link href={`/seller/${seller.slug}`} className="text-accent underline underline-offset-4">View Storefront</Link>
      </p>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search your products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Badge variant="outline">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</Badge>
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
    </div>
  );
}

function SellerProductFormDialog({ sellerId, product }: { sellerId: string; product?: any }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    compare_at_price: product?.compare_at_price?.toString() || '',
    category: product?.category || '',
    tags: (product?.tags as string[]) || [],
    stock: product?.stock?.toString() || '0',
    image_url: product?.image_url || '',
    is_active: product?.is_active ?? true,
  });

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        category: form.category || null,
        tags: form.tags,
        stock: parseInt(form.stock),
        image_url: form.image_url || null,
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
      toast.success(product ? 'Product updated' : 'Product created');
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
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
          <div className="space-y-2"><Label>Image URL</Label><Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} /></div>
          <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || !form.price || mutation.isPending} className="w-full">
            {mutation.isPending ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
