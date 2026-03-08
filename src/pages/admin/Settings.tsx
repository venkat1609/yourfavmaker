import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Package, Tag } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-heading mb-6">Settings</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <ManageListSection title="Categories" icon={<Package className="h-4 w-4" />} description="Product categories used in the shop catalog filters." tableName="categories" queryKey="admin-categories" />
        <ManageListSection title="Tags" icon={<Tag className="h-4 w-4" />} description="Tags used for landing page sections and promotions." tableName="tags" queryKey="admin-tags" />
      </div>
    </div>
  );
}

function ManageListSection({ title, icon, description, queryKey, tableName }: {
  title: string; icon: React.ReactNode; description: string; queryKey: string; tableName: 'categories' | 'tags';
}) {
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
    onError: (e: any) => toast.error(e.message.includes('unique') ? 'Already exists' : e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => { const { error } = await supabase.from(tableName).update({ name: name.trim() }).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); setEditingId(null); toast.success('Updated'); },
    onError: (e: any) => toast.error(e.message.includes('unique') ? 'Already exists' : e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from(tableName).delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [queryKey] }); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="border rounded-sm p-6">
      <div className="flex items-center gap-2 mb-1">{icon}<h3 className="text-lg font-heading">{title}</h3></div>
      <p className="text-sm text-muted-foreground mb-5">{description}</p>
      <div className="flex gap-2 mb-4">
        <Input placeholder={`New ${title.toLowerCase().slice(0, -1)}...`} value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) addItem.mutate(newName); }} />
        <Button size="sm" onClick={() => newName.trim() && addItem.mutate(newName)} disabled={addItem.isPending}><Plus className="h-4 w-4" /></Button>
      </div>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-secondary rounded-sm animate-pulse" />)}</div>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 p-2 rounded-sm hover:bg-muted/50 group">
              {editingId === item.id ? (
                <>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') updateItem.mutate({ id: item.id, name: editName }); if (e.key === 'Escape') setEditingId(null); }} className="flex-1 h-8" autoFocus />
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => updateItem.mutate({ id: item.id, name: editName })}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{item.name}</span>
                  <button onClick={() => { setEditingId(item.id); setEditName(item.name); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity p-1"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteItem.mutate(item.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                </>
              )}
            </div>
          ))}
          {items.length === 0 && <p className="text-center py-4 text-muted-foreground text-sm">No {title.toLowerCase()} yet</p>}
        </div>
      )}
    </div>
  );
}
