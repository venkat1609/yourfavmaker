import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  product: Tables<'products'>;
}

export default function ProductCard({ product }: Props) {
  return (
    <Link to={`/product/${product.id}`} className="group block animate-fade-in">
      <div className="aspect-[3/4] overflow-hidden bg-secondary rounded-sm mb-3">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{product.category || 'General'}</p>
        <h3 className="text-sm font-medium leading-tight">{product.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">${Number(product.price).toFixed(2)}</span>
          {product.compare_at_price && (
            <span className="text-xs text-muted-foreground line-through">
              ${Number(product.compare_at_price).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
