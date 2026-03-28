"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/AdminSidebar';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout({ children }: { children?: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const sectionTitle = (() => {
    switch (pathname) {
      case '/admin':
        return 'Dashboard';
      case '/admin/products':
      case '/admin/inventory':
      case '/admin/categories':
      case '/admin/tags':
        return pathname === '/admin/inventory' ? 'Inventory' : 'Catalog';
      case '/admin/orders':
        return 'Sales';
      case '/admin/customers':
      case '/admin/sellers':
        return 'People';
      default:
        return 'Admin Dashboard';
    }
  })();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/');
    }
  }, [loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="min-h-[calc(100vh-4rem)] flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b px-4 gap-3">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground">{sectionTitle}</span>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
