import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Store, ChevronRight } from 'lucide-react';

interface SellerCardProps {
  seller: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    description: string | null;
    location: string | null;
  };
}

export default function SellerCard({ seller }: SellerCardProps) {
  const initials = seller.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Link
      href={`/seller/${seller.slug}`}
      className="group flex items-center gap-4 rounded-md border p-4 transition-all duration-200 hover:border-ring/40 hover:shadow-sm active:scale-[0.99]"
    >
      <Avatar className="h-12 w-12 border">
        {seller.logo_url ? (
          <AvatarImage src={seller.logo_url} alt={seller.name} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Store className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{seller.name}</span>
        </div>
        {seller.location && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{seller.location}</span>
          </div>
        )}
        <p className="text-xs text-primary mt-1 group-hover:underline">Visit storefront</p>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}
