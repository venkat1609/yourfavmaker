import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { PaginationControls, usePagination } from '@/components/PaginationControls';
import { useCategories, useTags, useSellers } from '@/hooks/useAdminData';

export default function Products() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const ITEMS_PER_PAGE = 10;

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('products').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const filtered = useMemo(() => {
    let result = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    if (filterCategory !== 'all') result = result.filter(p => p.category === filterCategory);
    if (filterTag !== 'all') result = result.filter(p => (p.tags as string[] | undefined)?.includes(filterTag));
    if (filterActive === 'active') result = result.filter(p => p.is_active);
    if (filterActive === 'inactive') result = result.filter(p => !p.is_active);
    return result;
  }, [products, search, filterCategory, filterTag, filterActive]);

  useEffect(() => { setPage(1); }, [search, filterCategory, filterTag, filterActive]);

  const { totalPages, getPageItems } = usePagination(filtered, ITEMS_PER_PAGE);
  const pageProducts = getPageItems(page);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading">Products</h1>
        <ProductFormDialog />
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {tags.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterActive} onValueChange={v => setFilterActive(v as any)}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground mb-4">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-secondary rounded-sm animate-pulse" />)}</div>
      ) : (
        <>
          <div className="border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="text-left p-3 font-medium">Product</th><th className="text-left p-3 font-medium hidden md:table-cell">Category</th><th className="text-left p-3 font-medium hidden lg:table-cell">Tags</th><th className="text-right p-3 font-medium">Price</th><th className="text-right p-3 font-medium hidden md:table-cell">Stock</th><th className="text-center p-3 font-medium">Active</th><th className="p-3"></th></tr></thead>
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
                    <td className="p-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {((p.tags as string[]) || []).map(t => (
                          <Badge key={t} variant="outline" className="text-[10px] py-0">{t}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right">₹{Number(p.price).toFixed(2)}</td>
                    <td className="p-3 text-right hidden md:table-cell">{p.stock}</td>
                    <td className="p-3 text-center"><Switch checked={p.is_active} onCheckedChange={v => toggleActive.mutate({ id: p.id, is_active: v })} /></td>
                    <td className="p-3"><ProductFormDialog product={p} /></td>
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

// ==================== Product Form Dialog ====================

interface AttributeRow { id?: string; name: string; values: string[]; display_order: number; _newValue?: string; }
interface VariantRow { id?: string; name: string; sku: string; price: string; compare_at_price: string; stock: string; options: Record<string, string>; is_active: boolean; }

function ProductFormDialog({ product }: { product?: any }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [form, setForm] = useState({
    name: product?.name || '', description: product?.description || '',
    price: product?.price?.toString() || '', compare_at_price: product?.compare_at_price?.toString() || '',
    category: product?.category || '', tags: (product?.tags as string[]) || [],
    stock: product?.stock?.toString() || '0', image_url: product?.image_url || '',
    is_active: product?.is_active ?? true, seller_id: product?.seller_id || '',
  });

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const { data: sellers = [] } = useSellers();
  const [attributes, setAttributes] = useState<AttributeRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);

  const { data: existingAttrs } = useQuery({
    queryKey: ['product-attributes', product?.id],
    queryFn: async () => { const { data, error } = await supabase.from('product_attributes').select('*').eq('product_id', product.id).order('display_order'); if (error) throw error; return data; },
    enabled: !!product && open,
  });
  const { data: existingVariants } = useQuery({
    queryKey: ['product-variants', product?.id],
    queryFn: async () => { const { data, error } = await supabase.from('product_variants').select('*').eq('product_id', product.id).order('created_at'); if (error) throw error; return data; },
    enabled: !!product && open,
  });

  useEffect(() => { if (existingAttrs) setAttributes(existingAttrs.map(a => ({ id: a.id, name: a.name, values: a.values || [], display_order: a.display_order, _newValue: '' }))); }, [existingAttrs]);
  useEffect(() => { if (existingVariants) setVariants(existingVariants.map(v => ({ id: v.id, name: v.name, sku: v.sku || '', price: v.price?.toString() || '', compare_at_price: v.compare_at_price?.toString() || '', stock: v.stock?.toString() || '0', options: (v.options as Record<string, string>) || {}, is_active: v.is_active }))); }, [existingVariants]);

  const addAttribute = () => setAttributes([...attributes, { name: '', values: [], display_order: attributes.length, _newValue: '' }]);
  const removeAttribute = (idx: number) => setAttributes(attributes.filter((_, i) => i !== idx));
  const updateAttribute = (idx: number, field: string, val: any) => setAttributes(attributes.map((a, i) => i === idx ? { ...a, [field]: val } : a));
  const addAttributeValue = (idx: number) => { const a = attributes[idx]; const v = (a._newValue || '').trim(); if (!v || a.values.includes(v)) return; setAttributes(attributes.map((a2, i) => i === idx ? { ...a2, values: [...a2.values, v], _newValue: '' } : a2)); };
  const removeAttributeValue = (ai: number, vi: number) => setAttributes(attributes.map((a, i) => i === ai ? { ...a, values: a.values.filter((_, j) => j !== vi) } : a));
  const addVariant = () => { const opts: Record<string, string> = {}; attributes.forEach(a => { if (a.name) opts[a.name] = a.values[0] || ''; }); setVariants([...variants, { name: '', sku: '', price: form.price, compare_at_price: '', stock: '0', options: opts, is_active: true }]); };
  const removeVariant = (idx: number) => setVariants(variants.filter((_, i) => i !== idx));
  const updateVariant = (idx: number, field: string, val: any) => setVariants(variants.map((v, i) => i === idx ? { ...v, [field]: val } : v));
  const updateVariantOption = (vi: number, attrName: string, val: string) => setVariants(variants.map((v, i) => i === vi ? { ...v, options: { ...v.options, [attrName]: val } } : v));

  const generateVariants = () => {
    const validAttrs = attributes.filter(a => a.name && a.values.length > 0);
    if (validAttrs.length === 0) { toast.error('Add attributes with values first'); return; }
    const combos: Record<string, string>[][] = validAttrs.reduce<Record<string, string>[][]>((acc, attr) => {
      if (acc.length === 0) return attr.values.map(v => [{ [attr.name]: v }]);
      return acc.flatMap(combo => attr.values.map(v => [...combo, { [attr.name]: v }]));
    }, []);
    setVariants(combos.map(combo => {
      const options = Object.assign({}, ...combo);
      return { name: Object.values(options).join(' / '), sku: '', price: form.price, compare_at_price: '', stock: '0', options, is_active: true };
    }));
    toast.success(`Generated ${combos.length} variants`);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const productData = {
        name: form.name, description: form.description || null, price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        category: form.category || null, tags: form.tags, stock: parseInt(form.stock),
        image_url: form.image_url || null, is_active: form.is_active,
        seller_id: form.seller_id || null,
      };
      let productId = product?.id;
      if (product) { const { error } = await supabase.from('products').update(productData).eq('id', product.id); if (error) throw error; }
      else { const { data, error } = await supabase.from('products').insert(productData).select().single(); if (error) throw error; productId = data.id; }
      if (product) await supabase.from('product_attributes').delete().eq('product_id', productId);
      const validAttrs = attributes.filter(a => a.name.trim());
      if (validAttrs.length > 0) { const { error } = await supabase.from('product_attributes').insert(validAttrs.map((a, i) => ({ product_id: productId, name: a.name.trim(), values: a.values, display_order: i }))); if (error) throw error; }
      if (product) await supabase.from('product_variants').delete().eq('product_id', productId);
      if (variants.length > 0) { const { error } = await supabase.from('product_variants').insert(variants.map(v => ({ product_id: productId, name: v.name || Object.values(v.options).join(' / ') || 'Default', sku: v.sku || null, price: parseFloat(v.price), compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null, stock: parseInt(v.stock), options: v.options, is_active: v.is_active }))); if (error) throw error; }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success(product ? 'Product updated' : 'Product created'); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? <button className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button> : <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>}
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
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Base Price</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                <div className="space-y-2"><Label>Compare At</Label><Input type="number" step="0.01" value={form.compare_at_price} onChange={e => setForm({ ...form, compare_at_price: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Base Stock</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
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
              <div className="space-y-2">
                <Label>Seller</Label>
                <Select value={form.seller_id} onValueChange={v => setForm({ ...form, seller_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select seller" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No seller</SelectItem>
                    {sellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="attributes">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Define attributes like Size, Color, Material.</p>
              {attributes.map((attr, idx) => (
                <div key={idx} className="border rounded-sm p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input placeholder="Attribute name" value={attr.name} onChange={e => updateAttribute(idx, 'name', e.target.value)} className="flex-1" />
                    <button onClick={() => removeAttribute(idx)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">{attr.values.map((v, vi) => <Badge key={vi} variant="secondary" className="gap-1 pr-1">{v}<button onClick={() => removeAttributeValue(idx, vi)} className="hover:text-destructive"><X className="h-3 w-3" /></button></Badge>)}</div>
                  <div className="flex gap-2">
                    <Input placeholder="Add value..." value={attr._newValue || ''} onChange={e => updateAttribute(idx, '_newValue', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAttributeValue(idx); } }} className="flex-1" />
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
                <p className="text-sm text-muted-foreground">Each variant has its own price, stock, and SKU.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={generateVariants}>Auto-Generate</Button>
                  <Button type="button" variant="outline" size="sm" onClick={addVariant}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                </div>
              </div>
              {variants.length === 0 && <p className="text-center py-6 text-muted-foreground text-sm">No variants. Uses base price and stock.</p>}
              {variants.map((variant, idx) => (
                <div key={idx} className="border rounded-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Input placeholder="Variant name" value={variant.name} onChange={e => updateVariant(idx, 'name', e.target.value)} className="flex-1 mr-2" />
                    <div className="flex items-center gap-2">
                      <Switch checked={variant.is_active} onCheckedChange={v => updateVariant(idx, 'is_active', v)} />
                      <button onClick={() => removeVariant(idx)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {attributes.filter(a => a.name && a.values.length > 0).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {attributes.filter(a => a.name && a.values.length > 0).map(attr => (
                        <div key={attr.name} className="space-y-1">
                          <Label className="text-xs">{attr.name}</Label>
                          <Select value={variant.options[attr.name] || ''} onValueChange={v => updateVariantOption(idx, attr.name, v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>{attr.values.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Price</Label><Input type="number" step="0.01" value={variant.price} onChange={e => updateVariant(idx, 'price', e.target.value)} className="h-8 text-xs" /></div>
                    <div className="space-y-1"><Label className="text-xs">Compare At</Label><Input type="number" step="0.01" value={variant.compare_at_price} onChange={e => updateVariant(idx, 'compare_at_price', e.target.value)} className="h-8 text-xs" /></div>
                    <div className="space-y-1"><Label className="text-xs">Stock</Label><Input type="number" value={variant.stock} onChange={e => updateVariant(idx, 'stock', e.target.value)} className="h-8 text-xs" /></div>
                    <div className="space-y-1"><Label className="text-xs">SKU</Label><Input value={variant.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} className="h-8 text-xs" /></div>
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
