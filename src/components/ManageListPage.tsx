"use client";

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminMasterTable } from '@/components/AdminMasterTable';
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

  const columns = useMemo(() => [
    {
      id: 'name',
      header: 'Name',
      accessor: (item: { id: string; name: string }) => {
        if (editingId !== item.id) {
          return <span className="text-sm">{item.name}</span>;
        }
        return (
          <Input
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') updateItem.mutate({ id: item.id, name: editName });
              if (event.key === 'Escape') setEditingId(null);
            }}
            className="h-9"
            autoFocus
          />
        );
      },
      sortable: true,
      sortAccessor: (item: { name: string }) => item.name.toLowerCase(),
      filterFn: (item: { name: string }, query: string) => item.name.toLowerCase().includes(query),
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (item: { id: string; name: string }) => {
        if (editingId === item.id) {
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-20"
                onClick={() => updateItem.mutate({ id: item.id, name: editName })}
              >
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        }
        return (
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setEditingId(item.id);
                setEditName(item.name);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                if (confirm(`Delete "${item.name}"?`)) deleteItem.mutate(item.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
      filterable: false,
      sortable: false,
      align: 'center',
      width: '160px',
    },
  ], [deleteItem, editName, editingId, updateItem]);

  return (
    <div className="animate-fade-in">

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
          <AdminMasterTable
            columns={columns}
            data={items}
            rowKey={(item) => item.id}
            options={{ showPagination: false, selectable: false }}
          />
        )}

      </div>
    </div>
  );
}
