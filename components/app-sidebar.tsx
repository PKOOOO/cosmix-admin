"use client";

import { 
  Settings,
  Package,
  CreditCard,
  BarChart3,
  List,
  CalendarCheck,
  Activity,
  User,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import StoreSwitcher from "@/components/store-switcher";

interface AppSidebarProps {
  stores: any[]; // Replace with your store type
}

export function AppSidebar({ stores }: AppSidebarProps) {
  const pathname = usePathname();
  const params = useParams();

  // Define your menu items to match your app's routes
  const routes = [
    {
      href: `/${params.storeId}`,
      label: 'Overview',
      icon: BarChart3,
      active: pathname === `/${params.storeId}`,
    },
    {
      href: `/${params.storeId}/services`,
      label: 'Services',
      icon: Package,
      active: pathname === `/${params.storeId}/services`,
    },
    {
      href: `/${params.storeId}/bookings`,
      label: 'Bookings',
      icon: CalendarCheck,
      active: pathname === `/${params.storeId}/bookings`,
    },
    {
      href: `/${params.storeId}/categories`,
      label: 'Categories',
      icon: List,
      active: pathname === `/${params.storeId}/categories`,
    },
    {
      href: `/${params.storeId}/saloons`,
      label: 'Saloons',
      icon: List,
      active: pathname === `/${params.storeId}/saloons`,
    },
    {
      href: `/${params.storeId}/settings`,
      label: 'Settings',
      icon: Settings,
      active: pathname === `/${params.storeId}/settings`,
    },
  ];

  // Group routes for better organization
  const mainRoutes = routes.slice(0, 1);
  const storeManagementRoutes = routes.slice(1, 4);
  const systemRoutes = routes.slice(4);

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3.5">
        <StoreSwitcher items={stores} />
      </SidebarHeader>
      
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainRoutes.map((route) => (
                <SidebarMenuItem key={route.href}>
                  <SidebarMenuButton asChild>
                    <a 
                      href={route.href}
                      className={cn(
                        route.active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"
                      )}
                    >
                      <route.icon />
                      <span>{route.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Store Management */}
        <SidebarGroup>
          <SidebarGroupLabel>Store Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {storeManagementRoutes.map((route) => (
                <SidebarMenuItem key={route.href}>
                  <SidebarMenuButton asChild>
                    <a 
                      href={route.href}
                      className={cn(
                        route.active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"
                      )}
                    >
                      <route.icon />
                      <span>{route.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemRoutes.map((route) => (
                <SidebarMenuItem key={route.href}>
                  <SidebarMenuButton asChild>
                    <a 
                      href={route.href}
                      className={cn(
                        route.active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"
                      )}
                    >
                      <route.icon />
                      <span>{route.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center space-x-2">
          <UserButton afterSignOutUrl="/" />
          <span className="text-sm font-medium">Account</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}