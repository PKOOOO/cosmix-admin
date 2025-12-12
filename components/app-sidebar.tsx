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
import { useState, useEffect } from "react";
import axios from "@/lib/axios";
import { UserButton, useAuth } from "@clerk/nextjs";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
// import StoreSwitcher from "@/components/store-switcher"; // No longer needed

interface AppSidebarProps {
  hasSaloons: boolean;
}

export function AppSidebar({ hasSaloons }: AppSidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const clerkToken = await getToken();
        const headers: Record<string, string> = {};
        
        // Send Clerk token if available
        if (clerkToken) {
          headers['X-User-Token'] = clerkToken;
        }
        
        // Get bearer token from cookie (set by WebView)
        const adminToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('admin_token='))
          ?.split('=')[1];
        
        // Send bearer token in Authorization header if available
        if (adminToken) {
          headers['Authorization'] = `Bearer ${adminToken}`;
        }
        
        console.log('[SIDEBAR] Checking admin status, Clerk token:', !!clerkToken, 'Bearer token:', !!adminToken);
        
        const response = await axios.get('/api/admin/check', { headers });
        console.log('[SIDEBAR] Admin check response:', response.data);
        // Explicitly check - only set to true if explicitly true
        const adminStatus = response.data?.isAdmin === true;
        console.log('[SIDEBAR] Setting isAdmin to:', adminStatus);
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('[SIDEBAR] Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    checkAdminStatus();
  }, [getToken]);

  // Define your menu items to match your app's routes
  const routes = [
    {
      href: '/dashboard',
      label: 'Palvelutilastot',
      icon: BarChart3,
      active: pathname === '/dashboard',
      disabled: !hasSaloons,
    },
    {
      href: '/dashboard/integration',
      label: 'Palkkaintegraatio',
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
      adminOnly: true, // Only admins can access services
    },
    {
      href: '/dashboard/bookings',
      label: 'Varaukset',
      icon: CalendarCheck,
      active: pathname === '/dashboard/bookings',
      disabled: !hasSaloons,
    },
    {
      href: '/dashboard/saloons',
      label: 'Palvelusi',
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

  // Admin Panel removed - access via direct URL only
  const adminRoutes: any[] = [];

  // Group routes for better organization
  const mainRoutes = routes.slice(0, 1);
  const saloonManagementRoutes = routes.slice(1, 4).filter(route => !route.adminOnly || isAdmin);
  const systemRoutes = routes.slice(4).filter(route => !route.adminOnly || isAdmin);

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

      </SidebarContent>

      {/* User Profile at Bottom */}
      <SidebarFooter className="p-2">
        <div className="flex items-center justify-center">
          <UserButton afterSignOutUrl="/" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}