"use client";

import Link from 'next/link';
import { ShoppingBag, User, Menu, X, LogOut, Shield, MapPin, Package, Pencil, ChevronRight, Store, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const query = value.trim();
    router.push(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="font-heading text-2xl tracking-tight">
          YourFavMaker
        </Link>

        <div className="hidden md:flex items-center gap-6 ml-auto mr-4">
          <div className="relative w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search products"
              className="pl-9"
              aria-label="Search products"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/cart" className="relative p-2 hover:bg-secondary rounded-sm transition-colors">
                <ShoppingBag className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-medium">
                    {itemCount}
                  </span>
                )}
              </Link>
              <ProfilePopover />
            </>
          ) : (
            <Link href="/auth">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t bg-background p-4 space-y-3 animate-fade-in">
          {user && (
              <>
                <Link href="/profile" className="block py-2 text-sm" onClick={() => setMenuOpen(false)}>Profile</Link>
                <button onClick={() => { signOut(); setMenuOpen(false); }} className="block py-2 text-sm text-destructive">Sign Out</button>
              </>
            )}
        </div>
      )}
    </header>
  );
}

function ProfilePopover() {
  const { user, signOut, isAdmin } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: seller } = useQuery({
    queryKey: ['my-seller', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('sellers').select('id, status').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data as { id: string; status: string } | null;
    },
    enabled: !!user && open,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('addresses').select('*').eq('user_id', user!.id).order('is_primary', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="p-2 hover:bg-secondary rounded-sm transition-colors">
            <User className="h-5 w-5" />
          </button>
        </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        {/* Profile header */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
            </div>
            <button
              onClick={() => { setOpen(false); router.push('/profile'); }}
              className="text-muted-foreground hover:text-foreground p-1"
              title="Edit profile"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <Separator />

        {/* Addresses */}
        <div className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Addresses</p>
          {(() => {
            const primaryAddress = addresses.find(addr => addr.is_primary);

            if (!primaryAddress) {
              return (
                <>
                  <p className="text-xs text-muted-foreground">No primary address saved</p>
                  <button
                    onClick={() => { setOpen(false); router.push('/profile/addresses'); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
                  >
                    Manage addresses <ChevronRight className="h-3 w-3" />
                  </button>
                </>
              );
            }

            return (
              <>
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">
                      {primaryAddress.label}
                      <span className="text-accent ml-1">(Primary)</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{primaryAddress.street}, {primaryAddress.city}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setOpen(false); router.push('/profile/addresses'); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
                >
                  Manage addresses <ChevronRight className="h-3 w-3" />
                </button>
              </>
            );
          })()}
        </div>

        <Separator />

        {/* Quick links */}
        <div className="p-2 space-y-1">
          <button
            onClick={() => { setOpen(false); router.push('/orders'); }}
            className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-sm hover:bg-secondary transition-colors"
          >
            <Package className="h-4 w-4 text-muted-foreground" /> Orders
          </button>
          {!seller && (
            <button
              onClick={() => { setOpen(false); router.push('/seller/register'); }}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-sm hover:bg-secondary transition-colors"
            >
              <Store className="h-4 w-4 text-muted-foreground" /> Become a Seller
            </button>
          )}
          {seller && (
            <button
              onClick={() => { setOpen(false); router.push('/seller/dashboard'); }}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-sm hover:bg-secondary transition-colors"
            >
              <Store className="h-4 w-4 text-muted-foreground" /> Seller Dashboard
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => { setOpen(false); router.push('/admin'); }}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-sm hover:bg-secondary transition-colors"
            >
              <Shield className="h-4 w-4 text-muted-foreground" /> Admin Dashboard
            </button>
          )}
          <Separator className="my-1" />
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-2 py-2 text-sm text-destructive rounded-sm hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
