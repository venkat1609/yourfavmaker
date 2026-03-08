import { Link } from 'react-router-dom';
import { ShoppingBag, User, Menu, X, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="font-heading text-2xl tracking-tight">
          Maison
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-body">
          <Link to="/shop" className="text-muted-foreground hover:text-foreground transition-colors">Shop</Link>
          {user && (
            <>
              <Link to="/orders" className="text-muted-foreground hover:text-foreground transition-colors">Orders</Link>
              <Link to="/profile" className="text-muted-foreground hover:text-foreground transition-colors">Profile</Link>
            </>
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
              <Link to="/profile" className="p-2 hover:bg-secondary rounded-sm transition-colors hidden md:block">
                <User className="h-5 w-5" />
              </Link>
              <Button variant="ghost" size="icon" onClick={signOut} className="hidden md:flex">
                <LogOut className="h-4 w-4" />
              </Button>
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
