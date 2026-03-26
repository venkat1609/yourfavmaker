import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import SectionHeading from '@/components/SectionHeading';
import SectionShell from '@/components/SectionShell';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  title: string;
  subtitle?: string;
  products: Tables<'products'>[];
  tag: string;
}

export default function CategorySection({ title, subtitle, products, tag }: Props) {
  if (products.length === 0) return null;

  return (
    <SectionShell>
        <SectionHeading
          title={title}
          subtitle={subtitle}
          actions={
            <Link
              href={`/products?tag=${encodeURIComponent(tag)}`}
              className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              View all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          }
        />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {products.slice(0, 4).map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <Link
        href={`/products?tag=${encodeURIComponent(tag)}`}
        className="flex sm:hidden items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6"
      >
        View all <ArrowRight className="h-4 w-4" />
      </Link>
    </SectionShell>
  );
}
