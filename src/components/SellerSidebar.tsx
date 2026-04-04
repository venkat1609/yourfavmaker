import { LayoutDashboard, ArrowLeft, Store, Plus, Package, ShoppingCart, MessageSquare, Settings, ChevronDown, Landmark, Boxes, FolderOpen, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import type { Database } from '@/integrations/supabase/types';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type StoreRow = Database['public']['Tables']['stores']['Row'];

const navLinkClassName =
  'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none transition-[color,background-color,transform,box-shadow] duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar active:scale-[0.98]';

const navLinkActiveClassName = 'bg-accent text-accent-foreground font-medium shadow-sm after:origin-left after:scale-x-100';

const HEADER_OFFSET = '4rem';

export function SellerSidebar({
  stores,
  activeStoreId,
  activeSection,
}: {
  stores: StoreRow[];
  activeStoreId: string | null;
  activeSection?: string | null;
}) {
  const { state } = useSidebar();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openStores, setOpenStores] = useState<Record<string, boolean>>({});
  const collapsed = state === 'collapsed';
  const activeStoreHref = '/seller/dashboard';
  const isDashboardActive = pathname === '/seller/dashboard' && !searchParams?.get('store');
  const isStoreSectionActive = (section: string, storeId: string) => {
    if (!activeStoreId || storeId !== activeStoreId) return false;
    const currentSection = activeSection || searchParams?.get('section') || 'overview';
    return currentSection === section;
  };

  useEffect(() => {
    if (!activeStoreId) return;
    setOpenStores((prev) => ({ ...prev, [activeStoreId]: true }));
  }, [activeStoreId]);

  const approvedStores = stores.filter((store) => store.status === 'approved');

  const sellerSections = [
    { title: 'Orders', section: 'orders', icon: ShoppingCart },
    { title: 'Products', section: 'products', icon: Package },
    { title: 'Collections', section: 'collections', icon: FolderOpen },
    { title: 'Inventory', section: 'inventory', icon: Boxes },
    { title: 'Earnings', section: 'earnings', icon: TrendingUp },
    { title: 'Payments', section: 'payments', icon: Landmark },
    { title: 'Customer Inquiry', section: 'inquiries', icon: MessageSquare },
    { title: 'Settings', section: 'settings', icon: Settings },
  ] as const;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r bg-sidebar"
      style={{ top: HEADER_OFFSET, height: `calc(100vh - ${HEADER_OFFSET})` }}
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href={activeStoreHref} className={cn(navLinkClassName, isDashboardActive && navLinkActiveClassName)}>
                    <LayoutDashboard className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-focus-within:scale-110 group-active:scale-95" />
                    {!collapsed && <span className="transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5">Overview</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {approvedStores.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Storefronts</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {approvedStores.map((store) => {
                  const isActive = store.id === activeStoreId;
                  const isOpen = openStores[store.id] ?? isActive;
                  return (
                    <Collapsible key={store.id} open={isOpen} onOpenChange={(open) => setOpenStores((prev) => ({ ...prev, [store.id]: open }))}>
                      <SidebarMenuItem>
                        <div className="flex items-center gap-1">
                            <SidebarMenuButton asChild className="flex-1">
                              <Link
                                href={`/seller/dashboard?store=${encodeURIComponent(store.id)}`}
                                className={cn(navLinkClassName, isActive && navLinkActiveClassName)}
                              >
                              <Store className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-focus-within:scale-110 group-active:scale-95" />
                              {!collapsed && (
                                <span className="min-w-0 flex-1 truncate transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5">
                                  {store.name}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                          {!collapsed && (
                            <CollapsibleTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  'mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                                  isOpen && 'bg-accent text-accent-foreground',
                                )}
                                aria-label={isOpen ? `Collapse ${store.name}` : `Expand ${store.name}`}
                              >
                                <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')} />
                              </button>
                            </CollapsibleTrigger>
                          )}
                        </div>

                        {!collapsed && (
                          <CollapsibleContent>
                            <SidebarMenuSub className="mt-1">
                              {sellerSections.map((item) => {
                                const isSectionActive = isStoreSectionActive(item.section, store.id);
                                return (
                                  <SidebarMenuSubItem key={item.section}>
                                    <SidebarMenuSubButton asChild isActive={isSectionActive}>
                                      <Link href={`/seller/dashboard?store=${encodeURIComponent(store.id)}&section=${item.section}`}>
                                        <item.icon className="h-4 w-4" />
                                        <span>{item.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        )}
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/seller/register" className={navLinkClassName}>
                <Plus className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-focus-within:scale-110 group-active:scale-95" />
                {!collapsed && <span className="transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5">Create Store</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink href="/" end className={navLinkClassName} activeClassName={navLinkActiveClassName}>
                <ArrowLeft className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-focus-within:scale-110 group-active:scale-95" />
                {!collapsed && <span className="transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5">Back to Store</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
