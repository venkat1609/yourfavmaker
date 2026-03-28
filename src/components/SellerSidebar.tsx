import { LayoutDashboard, ArrowLeft, Store, Plus, Package, ShoppingCart, MessageSquare, Settings, ChevronDown, Landmark } from 'lucide-react';
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

type SellerRow = Database['public']['Tables']['sellers']['Row'];

const navLinkClassName =
  'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none transition-[color,background-color,transform,box-shadow] duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar active:scale-[0.98]';

const navLinkActiveClassName = 'bg-accent text-accent-foreground font-medium shadow-sm after:origin-left after:scale-x-100';

const HEADER_OFFSET = '4rem';

export function SellerSidebar({
  sellers,
  activeSellerSlug,
  activeSection,
}: {
  sellers: SellerRow[];
  activeSellerSlug: string | null;
  activeSection?: string | null;
}) {
  const { state } = useSidebar();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openStores, setOpenStores] = useState<Record<string, boolean>>({});
  const collapsed = state === 'collapsed';
  const activeStoreHref = '/seller/dashboard';
  const isDashboardActive = pathname === '/seller/dashboard' && !searchParams?.get('store');
  const isStoreSectionActive = (section: string) => {
    if (!activeSellerSlug) return false;
    const currentSection = activeSection || searchParams?.get('section') || 'overview';
    return currentSection === section;
  };

  useEffect(() => {
    if (!activeSellerSlug) return;
    setOpenStores((prev) => ({ ...prev, [activeSellerSlug]: true }));
  }, [activeSellerSlug]);

  const sellerSections = [
    { title: 'Products', section: 'products', icon: Package },
    { title: 'Orders', section: 'orders', icon: ShoppingCart },
    { title: 'Customer Inquiry', section: 'inquiries', icon: MessageSquare },
    { title: 'Settings', section: 'settings', icon: Settings },
    { title: 'Earnings & Payments', section: 'earnings', icon: Landmark },
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

        <SidebarGroup>
          <SidebarGroupLabel>Storefronts</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sellers.map((seller) => {
                const isActive = seller.slug === activeSellerSlug;
                const isOpen = openStores[seller.slug] ?? isActive;
                return (
                  <Collapsible key={seller.id} open={isOpen} onOpenChange={(open) => setOpenStores((prev) => ({ ...prev, [seller.slug]: open }))}>
                    <SidebarMenuItem>
                      <div className="flex items-center gap-1">
                        <SidebarMenuButton asChild className="flex-1">
                          <Link
                            href={`/seller/dashboard?store=${encodeURIComponent(seller.slug)}`}
                            className={cn(navLinkClassName, isActive && navLinkActiveClassName)}
                          >
                            <Store className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-focus-within:scale-110 group-active:scale-95" />
                            {!collapsed && (
                              <span className="min-w-0 flex-1 truncate transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5">
                                {seller.name}
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
                              aria-label={isOpen ? `Collapse ${seller.name}` : `Expand ${seller.name}`}
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
                              const isSectionActive = isStoreSectionActive(item.section);
                              return (
                                <SidebarMenuSubItem key={item.section}>
                                  <SidebarMenuSubButton asChild isActive={isSectionActive}>
                                    <Link href={`/seller/dashboard?store=${encodeURIComponent(seller.slug)}&section=${item.section}`}>
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
