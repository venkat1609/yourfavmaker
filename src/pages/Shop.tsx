import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'name-asc';

export default function Shop() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category');
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyOnSale, setOnlyOnSale] = useState(false);

  useEffect(() => {
    setCategory(searchParams.get('category'));
  }, [searchParams]);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
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

  // Compute max price for slider
  const maxPrice = useMemo(() => {
    if (allProducts.length === 0) return 1000;
    return Math.ceil(Math.max(...allProducts.map(p => Number(p.price))) / 10) * 10;
  }, [allProducts]);

  // Reset price range when products load
  useEffect(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Category filter
    if (category) {
      result = result.filter(p => p.category === category);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }

    // Price range filter
    result = result.filter(p => {
      const price = Number(p.price);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // In stock filter
    if (onlyInStock) {
      result = result.filter(p => p.stock > 0);
    }

    // On sale filter
    if (onlyOnSale) {
      result = result.filter(p => p.compare_at_price && Number(p.compare_at_price) > Number(p.price));
    }

    // Sort
    switch (sort) {
      case 'price-asc':
        result.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case 'price-desc':
        result.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
      default:
        // already sorted by created_at desc
        break;
    }

    return result;
  }, [allProducts, category, search, sort, priceRange, onlyInStock, onlyOnSale]);

  const activeFilterCount = [
    category,
    search.trim(),
    priceRange[0] > 0 || priceRange[1] < maxPrice,
    onlyInStock,
    onlyOnSale,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setCategory(null);
    setSearch('');
    setPriceRange([0, maxPrice]);
    setOnlyInStock(false);
    setOnlyOnSale(false);
    setSort('newest');
  };

  return (
    <div className="container py-12">
      <div className="mb-8">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <h1 className="text-4xl font-heading mb-3">{category || 'All Products'}</h1>
        <p className="text-muted-foreground">
          {category ? `Browse our ${category.toLowerCase()} collection` : 'Thoughtfully curated essentials'}
        </p>
      </div>

      {/* Search & controls bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Select value={sort} onValueChange={v => setSort(v as SortOption)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price-asc">Price: Low → High</SelectItem>
              <SelectItem value="price-desc">Price: High → Low</SelectItem>
              <SelectItem value="name-asc">Name: A → Z</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Expandable filter panel */}
      {showFilters && (
        <div className="border rounded-sm p-5 mb-6 space-y-5 animate-fade-in bg-card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Filters</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground underline">
                Clear all
              </button>
            )}
          </div>

          {/* Price range */}
          <div className="space-y-3">
            <Label className="text-sm">Price Range</Label>
            <Slider
              min={0}
              max={maxPrice}
              step={1}
              value={priceRange}
              onValueChange={v => setPriceRange(v as [number, number])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>${priceRange[0]}</span>
              <span>${priceRange[1]}</span>
            </div>
          </div>

          {/* Toggle filters */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch id="in-stock" checked={onlyInStock} onCheckedChange={setOnlyInStock} />
              <Label htmlFor="in-stock" className="text-sm cursor-pointer">In stock only</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="on-sale" checked={onlyOnSale} onCheckedChange={setOnlyOnSale} />
              <Label htmlFor="on-sale" className="text-sm cursor-pointer">On sale</Label>
            </div>
          </div>
        </div>
      )}

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
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

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-6">
        {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
        {activeFilterCount > 0 && ' (filtered)'}
      </p>

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
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No products found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
          {activeFilterCount > 0 && (
            <Button variant="outline" size="sm" className="mt-4" onClick={clearAllFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
