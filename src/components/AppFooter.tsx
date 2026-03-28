"use client";

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

export default function AppFooter() {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin') || pathname === '/seller/dashboard') {
    return null;
  }

  return (
    <footer className="border-t border-white/10 bg-[#2c493d] text-white">
      <div className="container max-w-6xl py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,minmax(0,0.9fr))] md:gap-12">
          <div className="space-y-4">
            <p className="text-sm font-heading tracking-wide text-white">YourFavMaker</p>
            <p className="max-w-sm text-sm leading-7 text-white/75">
              Curated commerce for modern brands.
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">Shop</p>
            <div className="flex flex-col gap-3 text-sm text-white/80">
              <Link href={'/products' as Route} className="transition-colors hover:text-white">All Products</Link>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">For Sellers</p>
            <div className="flex flex-col gap-3 text-sm text-white/80">
              <Link href={'/seller' as Route} className="transition-colors hover:text-white">Become a Seller</Link>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">Company</p>
            <div className="flex flex-col gap-3 text-sm text-white/80">
              <Link href={'/about' as Route} className="transition-colors hover:text-white">About Us</Link>
              <Link href={'/contact' as Route} className="transition-colors hover:text-white">Contact</Link>
              <Link href={'/privacy' as Route} className="transition-colors hover:text-white">Privacy Policy</Link>
              <Link href={'/terms' as Route} className="transition-colors hover:text-white">Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-center text-xs text-white/60">
          <p>© {new Date().getFullYear()} YourFavMaker. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
