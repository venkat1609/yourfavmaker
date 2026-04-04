"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, FolderOpen, Package, Pencil, Trash2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type CollectionRow = Database['public']['Tables']['collections']['Row'];
type ProductRow = Pick<
  Database['public']['Tables']['products']['Row'],
  'id' | 'name' | 'image_url' | 'category' | 'price' | 'is_active' | 'collection_id'
>;

type CollectionFormState = {
  name: string;
  description: string;
};

export type SellerCollectionsManagerHandle = {
  openCreateCollection: () => void;
};

type SellerCollectionsManagerProps = {
  sellerId: string;
  onSelectionChange?: (insideCollection: boolean) => void;
};

export const SellerCollectionsManager = forwardRef<SellerCollectionsManagerHandle, SellerCollectionsManagerProps>(
  function SellerCollectionsManager({ sellerId, onSelectionChange }, ref) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<CollectionRow | null>(null);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [dragOverCollectionId, setDragOverCollectionId] = useState<string | null>(null);
    const [dragOverBackTarget, setDragOverBackTarget] = useState(false);
    const [draggingProductId, setDraggingProductId] = useState<string | null>(null);
    const [collectionToDelete, setCollectionToDelete] = useState<CollectionRow | null>(null);
    const [form, setForm] = useState<CollectionFormState>({ name: '', description: '' });

    const { data: collections = [], isLoading: collectionsLoading } = useQuery({
      queryKey: ['seller-collections', sellerId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('collections')
          .select('*')
          .eq('seller_id', sellerId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as CollectionRow[];
      },
    });

    const { data: products = [], isLoading: productsLoading } = useQuery({
      queryKey: ['seller-collection-products', sellerId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, image_url, category, price, is_active, collection_id')
          .eq('seller_id', sellerId);
        if (error) throw error;
        return (data || []) as ProductRow[];
      },
    });

    const productCountByCollection = useMemo(
      () =>
        products.reduce<Record<string, number>>((acc, product) => {
          if (!product.collection_id) return acc;
          acc[product.collection_id] = (acc[product.collection_id] || 0) + 1;
          return acc;
        }, {}),
      [products],
    );

    const selectedCollection = useMemo(
      () => collections.find(collection => collection.id === selectedCollectionId) || null,
      [collections, selectedCollectionId],
    );

    const productsInSelectedCollection = useMemo(
      () => products.filter(product => product.collection_id === selectedCollectionId),
      [products, selectedCollectionId],
    );

    const unassignedProducts = useMemo(
      () => products.filter(product => !product.collection_id),
      [products],
    );

    const previewProductsByCollection = useMemo(
      () =>
        collections.reduce<Record<string, ProductRow[]>>((acc, collection) => {
          acc[collection.id] = products
            .filter(product => product.collection_id === collection.id && product.image_url)
            .slice(0, 3);
          return acc;
        }, {}),
      [collections, products],
    );

    useEffect(() => {
      if (!editingCollection) {
        setForm({ name: '', description: '' });
        return;
      }

      setForm({
        name: editingCollection.name,
        description: editingCollection.description || '',
      });
    }, [editingCollection]);

    useEffect(() => {
      if (selectedCollectionId && !collections.some(collection => collection.id === selectedCollectionId)) {
        setSelectedCollectionId(null);
      }
    }, [collections, selectedCollectionId]);

    useEffect(() => {
      onSelectionChange?.(Boolean(selectedCollection));
    }, [onSelectionChange, selectedCollection]);

    const assignProductMutation = useMutation({
      mutationFn: async ({ productId, collectionId }: { productId: string; collectionId: string | null }) => {
        const { error } = await supabase
          .from('products')
          .update({ collection_id: collectionId })
          .eq('id', productId)
          .eq('seller_id', sellerId);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['seller-collection-products', sellerId] });
        queryClient.invalidateQueries({ queryKey: ['seller-products', sellerId] });
        queryClient.invalidateQueries({ queryKey: ['seller-collections', sellerId] });
        toast.success('Product moved');
      },
      onError: (error: unknown) => {
        toast.error(error instanceof Error ? error.message : 'Unable to move product');
      },
    });

    const saveMutation = useMutation({
      mutationFn: async () => {
        const payload = {
          seller_id: sellerId,
          name: form.name.trim(),
          description: form.description.trim() || null,
        };

        if (editingCollection) {
          const { error } = await supabase.from('collections').update(payload).eq('id', editingCollection.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('collections').insert(payload);
          if (error) throw error;
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['seller-collections', sellerId] });
        queryClient.invalidateQueries({ queryKey: ['seller-collection-products', sellerId] });
        queryClient.invalidateQueries({ queryKey: ['seller-products', sellerId] });
        toast.success(editingCollection ? 'Collection updated' : 'Collection created');
        setOpen(false);
        setEditingCollection(null);
      },
      onError: (error: unknown) => {
        toast.error(error instanceof Error ? error.message : 'Unable to save collection');
      },
    });

    const deleteMutation = useMutation({
      mutationFn: async (collectionId: string) => {
        const { error } = await supabase.from('collections').delete().eq('id', collectionId);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['seller-collections', sellerId] });
        queryClient.invalidateQueries({ queryKey: ['seller-collection-products', sellerId] });
        queryClient.invalidateQueries({ queryKey: ['seller-products', sellerId] });
        toast.success('Collection deleted');
      },
      onError: (error: unknown) => {
        toast.error(error instanceof Error ? error.message : 'Unable to delete collection');
      },
    });

    useImperativeHandle(ref, () => ({
      openCreateCollection: () => {
        setEditingCollection(null);
        setOpen(true);
      },
    }));

  const collectionCard = (collection: CollectionRow) => (
    <div
      key={collection.id}
      onClick={() => setSelectedCollectionId(collection.id)}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOverCollectionId(collection.id);
      }}
      onDragLeave={() => setDragOverCollectionId(current => (current === collection.id ? null : current))}
      onDrop={(event) => {
        event.preventDefault();
        const productId = event.dataTransfer.getData('text/plain');
        if (productId) {
          assignProductMutation.mutate({ productId, collectionId: collection.id });
        }
        setDragOverCollectionId(null);
      }}
      className={cn(
        'border rounded-sm h-[128px] max-h-[128px] p-2 text-left space-y-0.5 transition-all duration-200 hover:bg-accent/20 cursor-pointer flex flex-col justify-between overflow-hidden',
        dragOverCollectionId === collection.id && 'border-primary/60 ring-2 ring-primary/20 bg-accent/30 scale-[0.99]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <p className="font-medium truncate">{collection.name}</p>
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {productCountByCollection[collection.id] || 0} products
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-transparent hover:bg-transparent"
            onClick={(event) => {
              event.stopPropagation();
              setEditingCollection(collection);
              setOpen(true);
            }}
            title="Edit collection"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-transparent hover:bg-transparent text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              setCollectionToDelete(collection);
            }}
            title="Delete collection"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {previewProductsByCollection[collection.id]?.length ? (
        <div className="mt-1 flex items-center gap-1">
          {previewProductsByCollection[collection.id].map((product) => (
            <div key={product.id} className="h-10 w-10 overflow-hidden rounded-sm border bg-secondary">
              {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  const productCard = (product: ProductRow) => (
    <div
      key={product.id}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', product.id);
        setDraggingProductId(product.id);
      }}
      onDragEnd={() => {
        setDraggingProductId(null);
        setDragOverBackTarget(false);
      }}
      className={cn(
        'border rounded-sm h-[128px] max-h-[128px] overflow-hidden bg-background transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col',
        draggingProductId === product.id && 'opacity-60 scale-[0.98]',
      )}
    >
      <div className="relative flex-1 min-h-0 bg-secondary overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 min-h-8 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-1.5 py-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/90 drop-shadow-sm truncate">
            {product.category || 'File'}
          </p>
          <p className="text-sm font-medium text-white drop-shadow-sm truncate">{product.name}</p>
        </div>
      </div>
    </div>
  );

    return (
      <div className="space-y-6">
      {selectedCollection ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8 transition-all', dragOverBackTarget && 'bg-accent text-accent-foreground ring-2 ring-primary/20')}
              onClick={() => setSelectedCollectionId(null)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverBackTarget(true);
              }}
              onDragLeave={() => setDragOverBackTarget(false)}
              onDrop={(event) => {
                event.preventDefault();
                const productId = event.dataTransfer.getData('text/plain');
                if (productId) {
                  assignProductMutation.mutate({ productId, collectionId: null });
                }
                setDragOverBackTarget(false);
              }}
              title="Drop here to remove from collection"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium truncate">{selectedCollection.name}</p>
              <p className="text-xs text-muted-foreground truncate">{selectedCollection.description || 'Collection'}</p>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {productsInSelectedCollection.map(productCard)}
          </div>
          {productsInSelectedCollection.length === 0 ? (
            <div className="border rounded-sm p-10 text-center text-sm text-muted-foreground">
              No products in this collection yet.
            </div>
          ) : null}
        </div>
      ) : collectionsLoading || productsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 rounded-sm bg-secondary animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {collections.map(collectionCard)}
            {unassignedProducts.map(productCard)}
          </div>
          {collections.length === 0 && unassignedProducts.length === 0 ? (
            <div className="border rounded-sm p-10 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No collections or files yet. Create a collection to get started.</p>
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCollection ? 'Edit Collection' : 'New Collection'}</DialogTitle>
            <DialogDescription>Collection names must be unique per storefront and help you stay organized.</DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} rows={4} />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || !form.name.trim()}>
                {saveMutation.isPending ? 'Saving...' : 'Save Collection'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(collectionToDelete)}
        onOpenChange={(open) => {
          if (!open) setCollectionToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{collectionToDelete?.name}" and unassign any products inside it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCollectionToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!collectionToDelete) return;
                deleteMutation.mutate(collectionToDelete.id);
                setCollectionToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    );
  },
);

SellerCollectionsManager.displayName = 'SellerCollectionsManager';
