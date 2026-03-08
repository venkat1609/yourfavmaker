import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import CategorySection from '@/components/CategorySection';
import CategoryBanner from '@/components/CategoryBanner';
import heroImg from '@/assets/hero-landing.jpg';
import summerImg from '@/assets/cat-summer.jpg';
import winterImg from '@/assets/cat-winter.jpg';
import newImg from '@/assets/cat-new.jpg';

const SECTIONS = [
  { category: 'Best Sellers', title: 'Best Sellers', subtitle: 'Our most loved pieces, chosen by you' },
  { category: 'Summer Fest', title: 'Summer Fest', subtitle: 'Light, breezy essentials for warmer days' },
  { category: 'Winter Wears', title: 'Winter Wears', subtitle: 'Cozy layers for the colder months' },
  { category: 'New Arrivals', title: 'New Arrivals', subtitle: 'Fresh finds, just landed' },
];

export default function Landing() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['all-products'],
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

  const getByTag = (tag: string) => products.filter(p => (p.tags as string[] | undefined)?.includes(tag));

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Curated essentials" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        </div>
        <div className="relative container py-28 md:py-40">
          <div className="max-w-lg animate-fade-in">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">Spring / Summer 2026</p>
            <h1 className="text-5xl md:text-6xl font-heading leading-tight mb-5">
              Thoughtfully Curated Essentials
            </h1>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Objects and garments designed for modern living. Each piece chosen for quality, beauty, and purpose.
            </p>
            <div className="flex gap-3">
              <Link to="/shop">
                <Button size="lg">Shop All</Button>
              </Link>
              <Link to="/shop?category=New+Arrivals">
                <Button variant="outline" size="lg">New Arrivals</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      {!isLoading && (
        <CategorySection
          title="Best Sellers"
          subtitle="Our most loved pieces, chosen by you"
          products={getByCategory('Best Sellers')}
          category="Best Sellers"
        />
      )}

      {/* Summer Banner */}
      <div className="container">
        <CategoryBanner
          title="Summer Fest"
          subtitle="Light linen, straw, and sun-ready essentials. Embrace the warmth with pieces designed for effortless summer days."
          image={summerImg}
          category="Summer Fest"
        />
      </div>

      {/* Summer Products */}
      {!isLoading && (
        <CategorySection
          title="Summer Fest"
          subtitle="Light, breezy essentials for warmer days"
          products={getByCategory('Summer Fest')}
          category="Summer Fest"
        />
      )}

      {/* Winter Banner */}
      <div className="container">
        <CategoryBanner
          title="Winter Wears"
          subtitle="Cashmere, wool, and leather. Luxurious layers to keep you warm through the coldest months."
          image={winterImg}
          category="Winter Wears"
          align="right"
        />
      </div>

      {/* Winter Products */}
      {!isLoading && (
        <CategorySection
          title="Winter Wears"
          subtitle="Cozy layers for the colder months"
          products={getByCategory('Winter Wears')}
          category="Winter Wears"
        />
      )}

      {/* New Arrivals Banner */}
      <div className="container">
        <CategoryBanner
          title="New Arrivals"
          subtitle="Fresh finds just landed in the shop. From sustainable wellness to artisan home goods."
          image={newImg}
          category="New Arrivals"
        />
      </div>

      {/* New Arrivals Products */}
      {!isLoading && (
        <CategorySection
          title="New Arrivals"
          subtitle="Fresh finds, just landed"
          products={getByCategory('New Arrivals')}
          category="New Arrivals"
        />
      )}

      {/* Also show remaining categories that aren't featured */}
      {!isLoading && (() => {
        const featured = ['Best Sellers', 'Summer Fest', 'Winter Wears', 'New Arrivals'];
        const others = [...new Set(products.map(p => p.category).filter(c => c && !featured.includes(c!)))];
        return others.map(cat => (
          <CategorySection
            key={cat}
            title={cat!}
            subtitle=""
            products={getByCategory(cat!)}
            category={cat!}
          />
        ));
      })()}

      {/* Loading state */}
      {isLoading && (
        <div className="container py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[3/4] bg-secondary rounded-sm animate-pulse" />
                <div className="h-3 bg-secondary rounded w-1/3 animate-pulse" />
                <div className="h-4 bg-secondary rounded w-2/3 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
