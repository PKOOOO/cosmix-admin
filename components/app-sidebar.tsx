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
  CloudIcon,
} from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
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
  hasSaloons: boolean;
}

export function AppSidebar({ stores, hasSaloons }: AppSidebarProps) {
  const pathname = usePathname();
  const params = useParams();

  // Define your menu items to match your app's routes
  const routes = [
    {
      href: `/${params.storeId}`,
      label: 'Overview',
      icon: BarChart3,
      active: pathname === `/${params.storeId}`,
      disabled: !hasSaloons,
    },
    {
      href: `/${params.storeId}/intergration`,
      label: 'Stripe Connect',
      icon: CloudIcon,
      active: pathname === `/${params.storeId}/intergration`,
      disabled: !hasSaloons,
    },
    {
      href: `/${params.storeId}/services`,
      label: 'Services',
      icon: Package,
      active: pathname === `/${params.storeId}/services`,
      disabled: !hasSaloons,
    },
    {
      href: `/${params.storeId}/bookings`,
      label: 'Bookings',
      icon: CalendarCheck,
      active: pathname === `/${params.storeId}/bookings`,
      disabled: !hasSaloons,
    },
    {
      href: `/${params.storeId}/categories`,
      label: 'Categories',
      icon: List,
      active: pathname === `/${params.storeId}/categories`,
      disabled: !hasSaloons,
    },
    {
      href: `/${params.storeId}/saloons`,
      label: 'Saloons',
      icon: List,
      active: pathname === `/${params.storeId}/saloons`,
      disabled: false, // Always allow access to saloons
    },
    {
      href: `/${params.storeId}/settings`,
      label: 'Settings',
      icon: Settings,
      active: pathname === `/${params.storeId}/settings`,
      disabled: !hasSaloons,
    },
  ];

  // Group routes for better organization
  const mainRoutes = routes.slice(0, 1);
  const storeManagementRoutes = routes.slice(1, 4);
  const systemRoutes = routes.slice(4);

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4 md:py-3.5">
        <StoreSwitcher items={stores} />
      </SidebarHeader>
      
      <SidebarContent className="px-2 md:px-0">
        {/* Main Navigation */}
        <SidebarGroup className="px-2 md:px-0">
          <SidebarGroupLabel className="text-sm md:text-xs font-semibold px-3 py-2">Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainRoutes.map((route) => (
                <SidebarMenuItem key={route.href}>
                  <SidebarMenuButton asChild size="lg" className="h-12 md:h-8 text-base md:text-sm">
                    <a 
                      href={route.disabled ? "#" : route.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 md:px-2 md:py-2 rounded-lg transition-colors",
                        route.disabled ? "text-muted-foreground cursor-not-allowed opacity-50" : 
                        route.active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      onClick={route.disabled ? (e) => e.preventDefault() : undefined}
                    >
                      <route.icon className="h-5 w-5 md:h-4 md:w-4" />
                      <span className="font-medium">{route.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Store Management */}
        <SidebarGroup className="px-2 md:px-0">
          <SidebarGroupLabel className="text-sm md:text-xs font-semibold px-3 py-2">Store Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {storeManagementRoutes.map((route) => (
                <SidebarMenuItem key={route.href}>
                  <SidebarMenuButton asChild size="lg" className="h-12 md:h-8 text-base md:text-sm">
                    <a 
                      href={route.disabled ? "#" : route.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 md:px-2 md:py-2 rounded-lg transition-colors",
                        route.disabled ? "text-muted-foreground cursor-not-allowed opacity-50" : 
                        route.active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      onClick={route.disabled ? (e) => e.preventDefault() : undefined}
                    >
                      <route.icon className="h-5 w-5 md:h-4 md:w-4" />
                      <span className="font-medium">{route.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System */}
        <SidebarGroup className="px-2 md:px-0">
          <SidebarGroupLabel className="text-sm md:text-xs font-semibold px-3 py-2">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {systemRoutes.map((route) => (
                <SidebarMenuItem key={route.href}>
                  <SidebarMenuButton asChild size="lg" className="h-12 md:h-8 text-base md:text-sm">
                    <a 
                      href={route.disabled ? "#" : route.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 md:px-2 md:py-2 rounded-lg transition-colors",
                        route.disabled ? "text-muted-foreground cursor-not-allowed opacity-50" : 
                        route.active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      onClick={route.disabled ? (e) => e.preventDefault() : undefined}
                    >
                      <route.icon className="h-5 w-5 md:h-4 md:w-4" />
                      <span className="font-medium">{route.label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
    </Sidebar>
  );
}