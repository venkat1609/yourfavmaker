import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import { useState } from 'react';

export default function Shop() {
  const [category, setCategory] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', category],
    queryFn: async () => {
      let query = supabase.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
      if (category) query = query.eq('category', category);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('category').eq('is_active', true);
      const unique = [...new Set((data || []).map(p => p.category).filter(Boolean))];
      return unique as string[];
    },
  });

  return (
    <div className="container py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-heading mb-3">Shop</h1>
        <p className="text-muted-foreground">Thoughtfully curated essentials</p>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          <button
            onClick={() => setCategory(null)}
            className={`px-4 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors ${!category ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors ${category === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[3/4] bg-secondary rounded-sm animate-pulse" />
              <div className="h-3 bg-secondary rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-secondary rounded w-2/3 animate-pulse" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No products yet</p>
          <p className="text-sm mt-1">Check back soon</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
