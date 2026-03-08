import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PaginationControls, usePagination } from '@/components/PaginationControls';
import { ArrowLeft, Search, SlidersHorizontal, X, ChevronDown, Tag, DollarSign, PackageCheck, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'name-asc';

export default function Shop() {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category');
  const initialTag = searchParams.get('tag');
  const isMobile = useIsMobile();

  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategory ? [initialCategory] : []);
  const [selectedTag, setSelectedTag] = useState<string | null>(initialTag);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyOnSale, setOnlyOnSale] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PRODUCTS_PER_PAGE = 12;

  // Collapsible section states
  const [catOpen, setCatOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);
  const [availOpen, setAvailOpen] = useState(true);

  useEffect(() => {
    const cat = searchParams.get('category');
    const tag = searchParams.get('tag');
    if (cat) setSelectedCategories([cat]);
    else setSelectedCategories([]);
    setSelectedTag(tag);
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

  // Per-category product count
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allProducts.forEach(p => {
      const cat = p.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allProducts]);

  const maxPrice = useMemo(() => {
    if (allProducts.length === 0) return 1000;
    return Math.ceil(Math.max(...allProducts.map(p => Number(p.price))) / 10) * 10;
  }, [allProducts]);

  useEffect(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    if (selectedCategories.length > 0) {
      result = result.filter(p => selectedCategories.includes(p.category || ''));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }

    result = result.filter(p => {
      const price = Number(p.price);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    if (onlyInStock) result = result.filter(p => p.stock > 0);
    if (onlyOnSale) result = result.filter(p => p.compare_at_price && Number(p.compare_at_price) > Number(p.price));

    switch (sort) {
      case 'price-asc': result.sort((a, b) => Number(a.price) - Number(b.price)); break;
      case 'price-desc': result.sort((a, b) => Number(b.price) - Number(a.price)); break;
      case 'name-asc': result.sort((a, b) => a.name.localeCompare(b.name)); break;
    }

    return result;
  }, [allProducts, selectedCategories, search, sort, priceRange, onlyInStock, onlyOnSale]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [selectedCategories, search, sort, priceRange, onlyInStock, onlyOnSale]);

  const { totalPages, getPageItems } = usePagination(filteredProducts, PRODUCTS_PER_PAGE);
  const paginatedProducts = getPageItems(currentPage);

  const activeFilterCount = [
    selectedCategories.length > 0,
    search.trim(),
    priceRange[0] > 0 || priceRange[1] < maxPrice,
    onlyInStock,
    onlyOnSale,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSearch('');
    setPriceRange([0, maxPrice]);
    setOnlyInStock(false);
    setOnlyOnSale(false);
    setSort('newest');
  };

  // The filter sidebar content (shared between desktop sidebar and mobile sheet)
  const filterContent = (
    <div className="space-y-1">
      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="px-1 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Filters</span>
            <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground underline">
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedCategories.map(cat => (
              <Badge key={cat} variant="secondary" className="gap-1 pr-1 text-xs">
                {cat}
                <button onClick={() => toggleCategory(cat)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {onlyInStock && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                In Stock
                <button onClick={() => setOnlyInStock(false)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {onlyOnSale && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                On Sale
                <button onClick={() => setOnlyOnSale(false)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {(priceRange[0] > 0 || priceRange[1] < maxPrice) && (
              <Badge variant="secondary" className="gap-1 pr-1 text-xs">
                ${priceRange[0]}–${priceRange[1]}
                <button onClick={() => setPriceRange([0, maxPrice])} className="hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* Categories */}
      <Collapsible open={catOpen} onOpenChange={setCatOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-1 text-sm font-medium hover:text-foreground transition-colors">
          <span className="flex items-center gap-2"><Tag className="h-4 w-4" /> Categories</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${catOpen ? '' : '-rotate-90'}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-1 pb-3 px-1">
            {categories.map(cat => (
              <label key={cat} className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
                <Checkbox
                  checked={selectedCategories.includes(cat)}
                  onCheckedChange={() => toggleCategory(cat)}
                />
                <span className="text-sm flex-1 group-hover:text-foreground transition-colors">{cat}</span>
                <span className="text-xs text-muted-foreground">{categoryCounts[cat] || 0}</span>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Price Range */}
      <Collapsible open={priceOpen} onOpenChange={setPriceOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-1 text-sm font-medium hover:text-foreground transition-colors">
          <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Price Range</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${priceOpen ? '' : '-rotate-90'}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 pb-4 px-1">
            <Slider
              min={0}
              max={maxPrice}
              step={1}
              value={priceRange}
              onValueChange={v => setPriceRange(v as [number, number])}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Min</Label>
                <Input
                  type="number"
                  min={0}
                  max={priceRange[1]}
                  value={priceRange[0]}
                  onChange={e => setPriceRange([Math.min(Number(e.target.value), priceRange[1]), priceRange[1]])}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <span className="text-muted-foreground mt-4">—</span>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Max</Label>
                <Input
                  type="number"
                  min={priceRange[0]}
                  max={maxPrice}
                  value={priceRange[1]}
                  onChange={e => setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0])])}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Availability */}
      <Collapsible open={availOpen} onOpenChange={setAvailOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-1 text-sm font-medium hover:text-foreground transition-colors">
          <span className="flex items-center gap-2"><PackageCheck className="h-4 w-4" /> Availability</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${availOpen ? '' : '-rotate-90'}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-3 pb-4 px-1">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm group-hover:text-foreground transition-colors">In stock only</span>
              <Switch checked={onlyInStock} onCheckedChange={setOnlyInStock} />
            </label>
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm flex items-center gap-1.5 group-hover:text-foreground transition-colors">
                <Sparkles className="h-3.5 w-3.5" /> On sale
              </span>
              <Switch checked={onlyOnSale} onCheckedChange={setOnlyOnSale} />
            </label>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  return (
    <div className="container py-12">
      {/* Header */}
      <div className="mb-8">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <h1 className="text-4xl font-heading mb-3">
          {selectedCategories.length === 1 ? selectedCategories[0] : 'All Products'}
        </h1>
        <p className="text-muted-foreground">
          {selectedCategories.length === 1
            ? `Browse our ${selectedCategories[0].toLowerCase()} collection`
            : 'Thoughtfully curated essentials'}
        </p>
      </div>

      {/* Top bar: search + sort + filter toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
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

          {/* Desktop: toggle sidebar */}
          {!isMobile && (
            <Button
              variant={sidebarOpen ? 'default' : 'outline'}
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="relative"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          )}

          {/* Mobile: open sheet */}
          {isMobile && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-left">Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  {filterContent}
                </div>
                <div className="mt-6">
                  <Button className="w-full" onClick={() => setMobileOpen(false)}>
                    Show {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-4">
        {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
        {activeFilterCount > 0 && ' (filtered)'}
      </p>

      {/* Main content: sidebar + products grid */}
      <div className="flex gap-8">
        {/* Desktop collapsible sidebar */}
        {!isMobile && sidebarOpen && (
          <aside className="w-[240px] flex-shrink-0 animate-fade-in">
            <div className="sticky top-24">
              {filterContent}
            </div>
          </aside>
        )}

        {/* Products grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className={`grid gap-6 ${sidebarOpen && !isMobile ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
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
            <>
              <div className={`grid gap-6 ${sidebarOpen && !isMobile ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
                {paginatedProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                className="mt-10"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
