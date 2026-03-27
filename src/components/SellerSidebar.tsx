import { LayoutDashboard, ArrowLeft, Store, Plus } from 'lucide-react';
import Link from 'next/link';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import type { Database } from '@/integrations/supabase/types';
import { usePathname, useSearchParams } from 'next/navigation';

type SellerRow = Database['public']['Tables']['sellers']['Row'];

const navLinkClassName =
  'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none transition-[color,background-color,transform,box-shadow] duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar active:scale-[0.98]';

const navLinkActiveClassName = 'bg-accent text-accent-foreground font-medium shadow-sm after:origin-left after:scale-x-100';

const HEADER_OFFSET = '4rem';

export function SellerSidebar({
  sellers,
  activeSellerSlug,
}: {
  sellers: SellerRow[];
  activeSellerSlug: string | null;
}) {
  const { state } = useSidebar();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const collapsed = state === 'collapsed';
  const activeStoreHref = '/seller/dashboard';
  const isDashboardActive = pathname === '/seller/dashboard' && !searchParams.get('store');

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
                return (
                  <SidebarMenuItem key={seller.id}>
                    <SidebarMenuButton asChild>
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
                  </SidebarMenuItem>
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
