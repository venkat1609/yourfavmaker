"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  queryKey: string;
  tableName: 'categories' | 'tags';
}

const iconActionButtonClassName =
  'relative rounded-sm p-1.5 text-muted-foreground opacity-0 translate-x-1 transition-[color,background-color,opacity,transform] duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:opacity-100 focus-visible:translate-x-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:translate-x-0 active:scale-95 after:absolute after:bottom-0 after:left-1.5 after:right-1.5 after:h-px after:origin-right after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:after:origin-left hover:after:scale-x-100 focus-visible:after:origin-left focus-visible:after:scale-x-100';

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong';

export default function ManageListPage({ title, description, queryKey, tableName }: Props) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      const { data, error } = await supabase.from(tableName).select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const addItem = useMutation({
    mutationFn: async (name: string) => { const { error } = await supabase.from(tableName).insert({ name: name.trim() }); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); setNewName(''); toast.success(`${title.slice(0, -1)} added`); },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(message.includes('unique') ? 'Already exists' : message);
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => { const { error } = await supabase.from(tableName).update({ name: name.trim() }).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); setEditingId(null); toast.success('Updated'); },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(message.includes('unique') ? 'Already exists' : message);
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from(tableName).delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); toast.success('Deleted'); },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  return (
    <div className="animate-fade-in">
      <h1 className="mb-1 text-2xl font-heading">{title}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{description}</p>

      <div className="max-w-lg">
        <div className="mb-6 flex gap-2">
          <Input
            placeholder={`New ${title.toLowerCase().slice(0, -1)}...`}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) addItem.mutate(newName); }}
          />
          <Button size="sm" onClick={() => newName.trim() && addItem.mutate(newName)} disabled={addItem.isPending} className="relative after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:origin-right after:scale-x-0 after:bg-primary-foreground after:transition-transform after:duration-200 hover:after:origin-left hover:after:scale-x-100 focus-visible:after:origin-left focus-visible:after:scale-x-100">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-sm bg-secondary" />)}</div>
        ) : (
          <div className="overflow-hidden rounded-sm border divide-y">
            {items.map(item => (
              <div key={item.id} className="group relative flex items-center gap-2 p-3 transition-[background-color,box-shadow] duration-200 hover:bg-muted/40 focus-within:bg-muted/40 focus-within:shadow-sm after:absolute after:bottom-0 after:left-3 after:right-3 after:h-px after:origin-right after:scale-x-0 after:bg-border after:transition-transform after:duration-200 hover:after:origin-left hover:after:scale-x-100 focus-within:after:origin-left focus-within:after:scale-x-100 last:after:hidden">
                {editingId === item.id ? (
                  <>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') updateItem.mutate({ id: item.id, name: editName }); if (e.key === 'Escape') setEditingId(null); }} className="h-8 flex-1" autoFocus />
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => updateItem.mutate({ id: item.id, name: editName })}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                  </>
                ) : (
                  <>
                    <span className="relative flex-1 text-sm after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-muted-foreground after:transition-transform after:duration-200 group-hover:after:origin-left group-hover:after:scale-x-100 group-focus-within:after:origin-left group-focus-within:after:scale-x-100">{item.name}</span>
                    <button type="button" onClick={() => { setEditingId(item.id); setEditName(item.name); }} className={iconActionButtonClassName}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteItem.mutate(item.id); }} className={iconActionButtonClassName}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
            {items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No {title.toLowerCase()} yet</p>}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">{items.length} {title.toLowerCase()}</p>
      </div>
    </div>
  );
}
