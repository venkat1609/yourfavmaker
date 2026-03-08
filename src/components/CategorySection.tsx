import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  title: string;
  subtitle?: string;
  products: Tables<'products'>[];
  tag: string;
}

export default function CategorySection({ title, subtitle, products, category }: Props) {
  if (products.length === 0) return null;

  return (
    <section className="py-16 animate-fade-in">
      <div className="container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-heading">{title}</h2>
            {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
          </div>
          <Link
            to={`/shop?category=${encodeURIComponent(category)}`}
            className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            View all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {products.slice(0, 4).map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <Link
          to={`/shop?category=${encodeURIComponent(category)}`}
          className="flex sm:hidden items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6"
        >
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
