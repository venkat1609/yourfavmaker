import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, Menu, X, LogOut, Shield, MapPin, Package, Pencil, ChevronRight, Store } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="font-heading text-2xl tracking-tight">
          YourFavMaker
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-body">
          <Link to="/shop" className="text-muted-foreground hover:text-foreground transition-colors">Shop</Link>
          {user && (
            <Link to="/orders" className="text-muted-foreground hover:text-foreground transition-colors">Orders</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Shield className="h-3 w-3" /> Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/cart" className="relative p-2 hover:bg-secondary rounded-sm transition-colors">
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
            <Link to="/auth">
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
          <Link to="/shop" className="block py-2 text-sm" onClick={() => setMenuOpen(false)}>Shop</Link>
          {user && (
            <>
              <Link to="/orders" className="block py-2 text-sm" onClick={() => setMenuOpen(false)}>Orders</Link>
              <Link to="/profile" className="block py-2 text-sm" onClick={() => setMenuOpen(false)}>Profile</Link>
              {isAdmin && (
                <Link to="/admin" className="block py-2 text-sm" onClick={() => setMenuOpen(false)}>Admin</Link>
              )}
              <button onClick={() => { signOut(); setMenuOpen(false); }} className="block py-2 text-sm text-destructive">Sign Out</button>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function ProfilePopover() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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
      const { data, error } = await supabase.from('addresses').select('*').eq('user_id', user!.id).order('is_default', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="p-2 hover:bg-secondary rounded-sm transition-colors hidden md:block">
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
              onClick={() => { setOpen(false); navigate('/profile'); }}
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
          {addresses.length === 0 ? (
            <p className="text-xs text-muted-foreground">No addresses saved</p>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {addresses.slice(0, 3).map(addr => (
                <div key={addr.id} className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">
                      {addr.label}
                      {addr.is_default && <span className="text-accent ml-1">(Default)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{addr.street}, {addr.city}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => { setOpen(false); navigate('/profile'); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
          >
            Manage addresses <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <Separator />

        {/* Quick links */}
        <div className="p-2">
          <button
            onClick={() => { setOpen(false); navigate('/orders'); }}
            className="flex items-center gap-2 w-full px-2 py-2 text-sm rounded-sm hover:bg-secondary transition-colors"
          >
            <Package className="h-4 w-4 text-muted-foreground" /> Orders
          </button>
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
