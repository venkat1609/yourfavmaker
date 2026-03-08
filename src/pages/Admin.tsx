import { useState, useEffect } from 'react';
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
import { Plus, Pencil, Package, Users, ShoppingCart, Trash2, X } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { PaginationControls, usePagination } from '@/components/PaginationControls';

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
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
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

// ---------- Attribute row in form ----------
interface AttributeRow {
  id?: string;
  name: string;
  values: string[];
  display_order: number;
  _newValue?: string;
}

// ---------- Variant row in form ----------
interface VariantRow {
  id?: string;
  name: string;
  sku: string;
  price: string;
  compare_at_price: string;
  stock: string;
  options: Record<string, string>;
  is_active: boolean;
}

function ProductFormDialog({ product }: { product?: any }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
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

  const [attributes, setAttributes] = useState<AttributeRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);

  // Load attributes & variants when editing
  const { data: existingAttrs } = useQuery({
    queryKey: ['product-attributes', product?.id],
    queryFn: async () => {
      if (!product) return [];
      const { data, error } = await supabase
        .from('product_attributes')
        .select('*')
        .eq('product_id', product.id)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!product && open,
  });

  const { data: existingVariants } = useQuery({
    queryKey: ['product-variants', product?.id],
    queryFn: async () => {
      if (!product) return [];
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!product && open,
  });

  useEffect(() => {
    if (existingAttrs) {
      setAttributes(existingAttrs.map(a => ({
        id: a.id,
        name: a.name,
        values: a.values || [],
        display_order: a.display_order,
        _newValue: '',
      })));
    }
  }, [existingAttrs]);

  useEffect(() => {
    if (existingVariants) {
      setVariants(existingVariants.map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku || '',
        price: v.price?.toString() || '',
        compare_at_price: v.compare_at_price?.toString() || '',
        stock: v.stock?.toString() || '0',
        options: (v.options as Record<string, string>) || {},
        is_active: v.is_active,
      })));
    }
  }, [existingVariants]);

  const addAttribute = () => {
    setAttributes([...attributes, { name: '', values: [], display_order: attributes.length, _newValue: '' }]);
  };

  const removeAttribute = (idx: number) => {
    setAttributes(attributes.filter((_, i) => i !== idx));
  };

  const updateAttribute = (idx: number, field: string, val: any) => {
    setAttributes(attributes.map((a, i) => i === idx ? { ...a, [field]: val } : a));
  };

  const addAttributeValue = (idx: number) => {
    const attr = attributes[idx];
    const v = (attr._newValue || '').trim();
    if (!v || attr.values.includes(v)) return;
    setAttributes(attributes.map((a, i) => i === idx ? { ...a, values: [...a.values, v], _newValue: '' } : a));
  };

  const removeAttributeValue = (attrIdx: number, valIdx: number) => {
    setAttributes(attributes.map((a, i) => i === attrIdx ? { ...a, values: a.values.filter((_, vi) => vi !== valIdx) } : a));
  };

  const addVariant = () => {
    const options: Record<string, string> = {};
    attributes.forEach(a => { if (a.name) options[a.name] = a.values[0] || ''; });
    setVariants([...variants, { name: '', sku: '', price: form.price, compare_at_price: '', stock: '0', options, is_active: true }]);
  };

  const removeVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const updateVariant = (idx: number, field: string, val: any) => {
    setVariants(variants.map((v, i) => i === idx ? { ...v, [field]: val } : v));
  };

  const updateVariantOption = (varIdx: number, attrName: string, val: string) => {
    setVariants(variants.map((v, i) => i === varIdx ? { ...v, options: { ...v.options, [attrName]: val } } : v));
  };

  const generateVariants = () => {
    const validAttrs = attributes.filter(a => a.name && a.values.length > 0);
    if (validAttrs.length === 0) { toast.error('Add attributes with values first'); return; }

    // Cartesian product
    const combos: Record<string, string>[][] = validAttrs.reduce<Record<string, string>[][]>(
      (acc, attr) => {
        if (acc.length === 0) return attr.values.map(v => [{ [attr.name]: v }]);
        return acc.flatMap(combo => attr.values.map(v => [...combo, { [attr.name]: v }]));
      },
      []
    );

    const newVariants: VariantRow[] = combos.map(combo => {
      const options = Object.assign({}, ...combo);
      const name = Object.values(options).join(' / ');
      return { name, sku: '', price: form.price, compare_at_price: '', stock: '0', options, is_active: true };
    });

    setVariants(newVariants);
    toast.success(`Generated ${newVariants.length} variants`);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const productData = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        category: form.category || null,
        stock: parseInt(form.stock),
        image_url: form.image_url || null,
        is_active: form.is_active,
      };

      let productId = product?.id;
      if (product) {
        const { error } = await supabase.from('products').update(productData).eq('id', product.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert(productData).select().single();
        if (error) throw error;
        productId = data.id;
      }

      // Save attributes — delete existing, re-insert
      if (product) {
        await supabase.from('product_attributes').delete().eq('product_id', productId);
      }
      const validAttrs = attributes.filter(a => a.name.trim());
      if (validAttrs.length > 0) {
        const { error: attrErr } = await supabase.from('product_attributes').insert(
          validAttrs.map((a, i) => ({
            product_id: productId,
            name: a.name.trim(),
            values: a.values,
            display_order: i,
          }))
        );
        if (attrErr) throw attrErr;
      }

      // Save variants — delete existing, re-insert
      if (product) {
        await supabase.from('product_variants').delete().eq('product_id', productId);
      }
      if (variants.length > 0) {
        const { error: varErr } = await supabase.from('product_variants').insert(
          variants.map(v => ({
            product_id: productId,
            name: v.name || Object.values(v.options).join(' / ') || 'Default',
            sku: v.sku || null,
            price: parseFloat(v.price),
            compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
            stock: parseInt(v.stock),
            options: v.options,
            is_active: v.is_active,
          }))
        );
        if (varErr) throw varErr;
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{product ? 'Edit Product' : 'New Product'}</DialogTitle></DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
            <TabsTrigger value="attributes" className="flex-1">Attributes</TabsTrigger>
            <TabsTrigger value="variants" className="flex-1">Variants</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="space-y-3">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Base Price</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Compare At</Label><Input type="number" step="0.01" value={form.compare_at_price} onChange={e => setForm({ ...form, compare_at_price: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
                <div className="space-y-2"><Label>Base Stock</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Image URL</Label><Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} /></div>
            </div>
          </TabsContent>

          <TabsContent value="attributes">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Define attributes like Size, Color, Material. Each attribute has a list of possible values.</p>
              {attributes.map((attr, idx) => (
                <div key={idx} className="border rounded-sm p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Attribute name (e.g. Size)"
                      value={attr.name}
                      onChange={e => updateAttribute(idx, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <button onClick={() => removeAttribute(idx)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attr.values.map((v, vi) => (
                      <Badge key={vi} variant="secondary" className="gap-1 pr-1">
                        {v}
                        <button onClick={() => removeAttributeValue(idx, vi)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add value..."
                      value={attr._newValue || ''}
                      onChange={e => updateAttribute(idx, '_newValue', e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAttributeValue(idx); } }}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => addAttributeValue(idx)}>Add</Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addAttribute} className="w-full"><Plus className="h-4 w-4 mr-1" /> Add Attribute</Button>
            </div>
          </TabsContent>

          <TabsContent value="variants">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Each variant can have its own price, stock, and SKU.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={generateVariants}>Auto-Generate</Button>
                  <Button type="button" variant="outline" size="sm" onClick={addVariant}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                </div>
              </div>
              {variants.length === 0 && (
                <p className="text-center py-6 text-muted-foreground text-sm">No variants. Product uses base price and stock.</p>
              )}
              {variants.map((variant, idx) => (
                <div key={idx} className="border rounded-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Input
                      placeholder="Variant name (e.g. Small / Red)"
                      value={variant.name}
                      onChange={e => updateVariant(idx, 'name', e.target.value)}
                      className="flex-1 mr-2"
                    />
                    <div className="flex items-center gap-2">
                      <Switch checked={variant.is_active} onCheckedChange={v => updateVariant(idx, 'is_active', v)} />
                      <button onClick={() => removeVariant(idx)} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Attribute options for this variant */}
                  {attributes.filter(a => a.name && a.values.length > 0).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {attributes.filter(a => a.name && a.values.length > 0).map(attr => (
                        <div key={attr.name} className="space-y-1">
                          <Label className="text-xs">{attr.name}</Label>
                          <Select
                            value={variant.options[attr.name] || ''}
                            onValueChange={v => updateVariantOption(idx, attr.name, v)}
                          >
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {attr.values.map(v => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Price</Label>
                      <Input type="number" step="0.01" value={variant.price} onChange={e => updateVariant(idx, 'price', e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Compare At</Label>
                      <Input type="number" step="0.01" value={variant.compare_at_price} onChange={e => updateVariant(idx, 'compare_at_price', e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Stock</Label>
                      <Input type="number" value={variant.stock} onChange={e => updateVariant(idx, 'stock', e.target.value)} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">SKU</Label>
                      <Input value={variant.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Button onClick={() => mutation.mutate()} className="w-full mt-4" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Product'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function OrdersTab() {
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
      {orders.map((order: any) => {
        const isExpanded = expandedOrder === order.id;
        const shipping = order.shipping_address as Record<string, string> | null;
        return (
          <div key={order.id} className="border rounded-sm overflow-hidden">
            {/* Header row — clickable */}
            <button
              onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
              className="w-full text-left p-5 hover:bg-muted/30 transition-colors"
            >
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
              <p className="text-xs text-muted-foreground mt-1">{order.order_items?.length || 0} item{order.order_items?.length !== 1 ? 's' : ''} · Click to {isExpanded ? 'collapse' : 'expand'}</p>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="border-t p-5 space-y-5 bg-muted/10 animate-fade-in">
                {/* Status update */}
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Update Status</Label>
                  <Select value={order.status} onValueChange={v => updateStatus.mutate({ id: order.id, status: v })}>
                    <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer info */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Customer</h4>
                  <div className="text-sm space-y-0.5">
                    <p>{order.profile?.full_name || '—'}</p>
                    <p className="text-muted-foreground">{order.profile?.email || '—'}</p>
                    {order.profile?.phone && <p className="text-muted-foreground">{order.profile.phone}</p>}
                  </div>
                </div>

                {/* Shipping address */}
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

                {/* Payment info */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Payment</h4>
                  <div className="text-sm space-y-0.5">
                    {order.razorpay_payment_id ? (
                      <>
                        <p>Payment ID: <span className="text-muted-foreground font-mono text-xs">{order.razorpay_payment_id}</span></p>
                        <p>Order ID: <span className="text-muted-foreground font-mono text-xs">{order.razorpay_order_id}</span></p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">No payment recorded</p>
                    )}
                  </div>
                </div>

                {/* Order items */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Items</h4>
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
                        {(order.order_items || []).map((item: any) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="p-2.5">
                              <p>{item.product_name}</p>
                              {item.variant_name && <p className="text-xs text-muted-foreground">{item.variant_name}</p>}
                            </td>
                            <td className="p-2.5 text-right text-muted-foreground">₹{Number(item.price).toFixed(2)}</td>
                            <td className="p-2.5 text-right text-muted-foreground">{item.quantity}</td>
                            <td className="p-2.5 text-right font-medium">₹{(Number(item.price) * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t">
                          <td colSpan={3} className="p-2.5 text-right font-medium text-xs">Total</td>
                          <td className="p-2.5 text-right font-medium">₹{Number(order.total).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
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
