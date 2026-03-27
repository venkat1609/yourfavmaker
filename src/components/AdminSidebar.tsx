import { Package, ShoppingCart, Users, LayoutDashboard, ArrowLeft, FolderOpen, Tag, Store } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
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

const dashboardItems = [
  { title: 'Overview', url: '/admin', icon: LayoutDashboard },
];

const catalogItems = [
  { title: 'Products', url: '/admin/products', icon: Package },
  { title: 'Categories', url: '/admin/categories', icon: FolderOpen },
  { title: 'Tags', url: '/admin/tags', icon: Tag },
];

const commerceItems = [
  { title: 'Orders', url: '/admin/orders', icon: ShoppingCart },
];

const peopleItems = [
  { title: 'Customers', url: '/admin/customers', icon: Users },
  { title: 'Sellers', url: '/admin/sellers', icon: Store },
];

const navLinkClassName =
  'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none transition-[color,background-color,transform,box-shadow] duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar active:scale-[0.98]';

const navLinkActiveClassName = 'bg-accent text-accent-foreground font-medium shadow-sm after:origin-left after:scale-x-100';

const HEADER_OFFSET = '4rem';

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

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
              {dashboardItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink href={item.url} end={item.url === '/admin'} className={navLinkClassName} activeClassName={navLinkActiveClassName}>
                      <item.icon className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-focus-within:scale-110 group-active:scale-95" />
                      {!collapsed && <span className="transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Catalog</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {catalogItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink href={item.url} className={navLinkClassName} activeClassName={navLinkActiveClassName}>
                      <item.icon className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-focus-within:scale-110 group-active:scale-95" />
                      {!collapsed && <span className="transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sales</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {commerceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink href={item.url} className={navLinkClassName} activeClassName={navLinkActiveClassName}>
                      <item.icon className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-focus-within:scale-110 group-active:scale-95" />
                      {!collapsed && <span className="transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>People</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {peopleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink href={item.url} className={navLinkClassName} activeClassName={navLinkActiveClassName}>
                      <item.icon className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-focus-within:scale-110 group-active:scale-95" />
                      {!collapsed && <span className="transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
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
