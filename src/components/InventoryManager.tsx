"use client";

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Package, Pencil } from 'lucide-react';
import { AdminMasterTable } from '@/components/AdminMasterTable';
import { toast } from 'sonner';
import { useStores } from '@/hooks/useAdminData';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type ProductRow = Pick<
  Database['public']['Tables']['products']['Row'],
  'id' | 'name' | 'category' | 'image_url' | 'stock' | 'is_active' | 'seller_id'
>;
type VariantRow = Pick<
  Database['public']['Tables']['product_variants']['Row'],
  'id' | 'product_id' | 'name' | 'sku' | 'stock'
>;

type InventoryScope = 'admin' | 'seller';

type VariantDraft = {
  id: string;
  name: string;
  sku: string;
  stock: string;
};

export function InventoryManager({
  scope,
  sellerId,
}: {
  scope: InventoryScope;
  sellerId?: string;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [draftStock, setDraftStock] = useState('0');
  const [draftVariants, setDraftVariants] = useState<VariantDraft[]>([]);

  const { data: stores = [] } = useStores();
  const storeMap = useMemo(() => new Map(stores.map(store => [store.id, store])), [stores]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['inventory-products', scope, sellerId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, name, category, image_url, stock, is_active, seller_id')
        .order('created_at', { ascending: false });

      if (scope === 'seller') {
        if (!sellerId) return [];
        query = query.eq('seller_id', sellerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ProductRow[];
    },
  });

  const productIds = useMemo(() => products.map(product => product.id), [products]);

  const { data: variants = [] } = useQuery({
    queryKey: ['inventory-variants', scope, sellerId, productIds.join(',')],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, product_id, name, sku, stock')
        .in('product_id', productIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as VariantRow[];
    },
    enabled: productIds.length > 0,
  });

const variantsByProduct = useMemo(() => {
  return variants.reduce<Record<string, VariantRow[]>>((acc, variant) => {
    if (!acc[variant.product_id]) acc[variant.product_id] = [];
    acc[variant.product_id].push(variant);
    return acc;
  }, {});
}, [variants]);

const inventoryColumns = useMemo(() => {
  const baseColumns = [
    {
      id: 'product',
      header: 'Product',
      accessor: (product: ProductRow) => {
        const variantCount = variantsByProduct[product.id]?.length || 0;
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-sm bg-secondary overflow-hidden flex-shrink-0">
              {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                {variantCount > 0 ? `${variantCount} variant${variantCount === 1 ? '' : 's'}` : 'No variants'}
              </p>
            </div>
          </div>
        );
      },
      filterFn: (product: ProductRow, query: string) => product.name.toLowerCase().includes(query),
      width: '320px',
      sortable: true,
      sortAccessor: (product: ProductRow) => product.name.toLowerCase(),
    },
    {
      id: 'category',
      header: 'Category',
      accessor: (product: ProductRow) => product.category || '-',
      filterFn: (product: ProductRow, query: string) => (product.category || '').toLowerCase().includes(query),
      align: 'left',
      sortable: true,
      sortAccessor: (product: ProductRow) => (product.category || '').toLowerCase(),
    },
    {
      id: 'stock',
      header: 'Stock',
      accessor: (product: ProductRow) => product.stock,
      align: 'right',
      sortAccessor: (product: ProductRow) => product.stock ?? 0,
      sortable: true,
    },
    {
      id: 'active',
      header: 'Active',
      accessor: (product: ProductRow) => (
        <Badge
          variant="outline"
          className={cn(
            'capitalize',
            product.is_active && 'border-success/30 text-success',
            !product.is_active && 'border-muted-foreground/30 text-muted-foreground',
          )}
        >
          {product.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
      filterable: false,
      align: 'center',
      width: '120px',
      sortable: true,
      sortAccessor: (product: ProductRow) => (product.is_active ? 1 : 0),
    },
  ];

  if (scope === 'admin') {
    baseColumns.splice(1, 0, {
      id: 'seller',
      header: 'Seller',
      accessor: (product: ProductRow) => {
        const seller = product.seller_id ? storeMap.get(product.seller_id) : null;
        return seller?.name || '-';
      },
      filterFn: (product: ProductRow, query: string) => {
        const seller = product.seller_id ? storeMap.get(product.seller_id) : null;
        return (seller?.name || '-').toLowerCase().includes(query);
      },
      width: '200px',
      align: 'left',
      sortable: true,
      sortAccessor: (product: ProductRow) => (product.seller_id ? storeMap.get(product.seller_id)?.name?.toLowerCase() || '-' : '-'),
    });
  }

  baseColumns.push({
    id: 'actions',
    header: 'Actions',
    accessor: (product: ProductRow) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => {
          setSelectedProductId(product.id);
          setOpen(true);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    ),
    filterable: false,
    align: 'right',
    width: '120px',
    sortable: false,
  });

  return baseColumns;
}, [scope, storeMap, variantsByProduct]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(product => {
      const storeName = product.seller_id ? storeMap.get(product.seller_id)?.name || '' : '';
      return (
        product.name.toLowerCase().includes(q) ||
        (product.category || '').toLowerCase().includes(q) ||
        storeName.toLowerCase().includes(q)
      );
    });
  }, [products, search, storeMap]);

  const selectedProduct = useMemo(
    () => products.find(product => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  useEffect(() => {
    if (!selectedProduct) return;
    setDraftStock(String(selectedProduct.stock ?? 0));
    setDraftVariants(
      (variantsByProduct[selectedProduct.id] || []).map(variant => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku || '',
        stock: String(variant.stock ?? 0),
      })),
    );
  }, [selectedProduct, variantsByProduct]);

  useEffect(() => {
    if (!open) {
      setSelectedProductId(null);
      setDraftStock('0');
      setDraftVariants([]);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) throw new Error('Choose a product first');

      const nextStock = Math.max(0, Number.parseInt(draftStock || '0', 10) || 0);
      const updates = [
        supabase.from('products').update({ stock: nextStock }).eq('id', selectedProduct.id),
        ...draftVariants.map(variant =>
          supabase
            .from('product_variants')
            .update({ stock: Math.max(0, Number.parseInt(variant.stock || '0', 10) || 0) })
            .eq('id', variant.id),
        ),
      ];

      const results = await Promise.all(updates);
      const firstError = results.find(result => result.error)?.error;
      if (firstError) throw firstError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-variants'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['product-variants'] });
      queryClient.invalidateQueries({ queryKey: ['seller-dashboard-stats'] });
      toast.success('Inventory updated');
      setOpen(false);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update inventory');
    },
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search inventory..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 rounded-sm bg-secondary animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="border rounded-sm p-10 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No inventory items match your search.</p>
        </div>
      ) : (
        <AdminMasterTable
          columns={inventoryColumns}
          data={filteredProducts}
          rowKey={product => product.id}
          options={{ showFilters: true, showPagination: false, showSelection: false }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Inventory</DialogTitle>
            <DialogDescription>
              Update stock for the selected product and any active variants.
            </DialogDescription>
          </DialogHeader>

          {selectedProduct ? (
            <div className="space-y-4">
              <div className="border rounded-sm p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-sm bg-secondary overflow-hidden flex-shrink-0">
                  {selectedProduct.image_url ? <img src={selectedProduct.image_url} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedProduct.category || 'Uncategorized'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Product Stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={draftStock}
                  onChange={e => setDraftStock(e.target.value)}
                />
              </div>

              {draftVariants.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Variants</p>
                  <div className="space-y-3">
                    {draftVariants.map((variant, index) => (
                      <div key={variant.id} className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3 items-end">
                        <div className="space-y-1">
                          <p className="text-sm font-medium truncate">{variant.name}</p>
                          <p className="text-xs text-muted-foreground">{variant.sku || 'No SKU'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Stock</Label>
                          <Input
                            type="number"
                            min="0"
                            value={variant.stock}
                            onChange={e => {
                              const value = e.target.value;
                              setDraftVariants(prev => prev.map((item, itemIndex) => itemIndex === index ? { ...item, stock: value } : item));
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                  {mutation.isPending ? 'Saving...' : 'Save Inventory'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
