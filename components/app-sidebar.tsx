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
  Shield,
} from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import axios from "axios";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
// import StoreSwitcher from "@/components/store-switcher"; // No longer needed

interface AppSidebarProps {
  hasSaloons: boolean;
}

export function AppSidebar({ hasSaloons }: AppSidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await axios.get('/api/admin/check');
        setIsAdmin(response.data.isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    checkAdminStatus();
  }, []);

  // Define your menu items to match your app's routes
  const routes = [
    {
      href: '/dashboard',
      label: 'Overview',
      icon: BarChart3,
      active: pathname === '/dashboard',
      disabled: !hasSaloons,
    },
    {
      href: '/dashboard/integration',
      label: 'Stripe Connect',
      icon: CloudIcon,
      active: pathname === '/dashboard/integration',
      disabled: !hasSaloons,
    },
    {
      href: '/dashboard/services',
      label: 'Services',
      icon: Package,
      active: pathname === '/dashboard/services',
      disabled: !hasSaloons,
    },
    {
      href: '/dashboard/bookings',
      label: 'Bookings',
      icon: CalendarCheck,
      active: pathname === '/dashboard/bookings',
      disabled: !hasSaloons,
    },
    {
      href: '/dashboard/categories',
      label: 'Categories',
      icon: List,
      active: pathname === '/dashboard/categories',
      disabled: !hasSaloons,
      adminOnly: false, // Regular users can view categories but not create them
    },
    {
      href: '/dashboard/saloons',
      label: 'Saloons',
      icon: List,
      active: pathname === '/dashboard/saloons',
      disabled: false, // Always allow access to saloons
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: Settings,
      active: pathname === '/dashboard/settings',
      disabled: !hasSaloons,
    },
  ];

  // Admin routes
  const adminRoutes = [
    {
      href: '/dashboard/admin',
      label: 'Admin Panel',
      icon: Shield,
      active: pathname === '/dashboard/admin',
      disabled: false,
    },
  ];

  // Group routes for better organization
  const mainRoutes = routes.slice(0, 1);
  const saloonManagementRoutes = routes.slice(1, 4);
  const systemRoutes = routes.slice(4);

  return (
    <Sidebar>
      <SidebarContent className="px-2 md:px-0">
        {/* Main Navigation */}
        <SidebarGroup className="px-2 md:px-0">
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

        {/* Saloon Management */}
        <SidebarGroup className="px-2 md:px-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {saloonManagementRoutes.map((route) => (
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

        {/* Admin Section - Only show for admins */}
        {!loading && isAdmin && (
          <SidebarGroup className="px-2 md:px-0">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {adminRoutes.map((route) => (
                  <SidebarMenuItem key={route.href}>
                    <SidebarMenuButton asChild size="lg" className="h-12 md:h-8 text-base md:text-sm">
                      <a 
                        href={route.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 md:px-2 md:py-2 rounded-lg transition-colors",
                          route.active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
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
        )}
      </SidebarContent>
      
    </Sidebar>
  );
}