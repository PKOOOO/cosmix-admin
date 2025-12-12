"use client";

import {
  Settings,
  BarChart3,
  List,
  CalendarCheck,
  CloudIcon,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect, Fragment } from "react";
import axios from "@/lib/axios";
import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";

interface DashboardNavbarProps {
  hasSaloons: boolean;
}

interface Route {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  disabled: boolean;
  adminOnly?: boolean;
}

const NavLink = ({ route }: { route: Route }) => (
  <Link
    href={route.disabled ? "#" : route.href}
    onClick={route.disabled ? (e) => e.preventDefault() : undefined}
    className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
      route.disabled
        ? "text-muted-foreground cursor-not-allowed opacity-50"
        : route.active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-accent hover:text-accent-foreground"
    )}
  >
    <route.icon className="h-4 w-4" />
    <span>{route.label}</span>
  </Link>
);

export function DashboardNavbar({ hasSaloons }: DashboardNavbarProps) {
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
        
        // Bearer token should be in cookie (set by WebView), but we can also check for it
        // The API endpoint will check both header and cookie
        
        const response = await axios.get('/api/admin/check', { headers });
        setIsAdmin(response.data.isAdmin || false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    checkAdminStatus();
  }, [getToken]);

  const routes: Route[] = [
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
      disabled: false,
    },
  ];

  const adminRoutes: Route[] = [
    {
      href: '/admin',
      label: 'Admin Panel',
      icon: Shield,
      active: pathname === '/admin',
      disabled: false,
    },
  ];

  const availableRoutes = routes.filter((route) => {
    return !route.disabled && (!route.adminOnly || isAdmin);
  });

  return (
    <Fragment>
      <nav className="hidden md:flex items-center justify-between px-6 py-3 border-b bg-background sticky top-0 z-50">
        <div className="flex items-center gap-1">
          {availableRoutes.map((route) => (
            <NavLink key={route.href} route={route} />
          ))}
          {!loading && isAdmin && adminRoutes.length > 0 && (
            <NavLink key={adminRoutes[0].href} route={adminRoutes[0]} />
          )}
        </div>
        <div className="flex items-center gap-4">
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>

      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
        <div className="flex items-center justify-around px-2 py-1.5">
          {availableRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.disabled ? "#" : route.href}
              onClick={route.disabled ? (e) => e.preventDefault() : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[60px]",
                route.disabled
                  ? "text-muted-foreground cursor-not-allowed opacity-50"
                  : route.active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <route.icon className="h-5 w-5" />
              <span className="text-xs font-medium text-center leading-tight">{route.label}</span>
            </Link>
          ))}
          {!loading && isAdmin && (() => {
            const adminRoute = adminRoutes[0];
            const AdminIcon = adminRoute.icon;
            return (
              <Link
                key={adminRoute.href}
                href={adminRoute.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[60px]",
                  adminRoute.active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <AdminIcon className="h-5 w-5" />
                <span className="text-xs font-medium text-center leading-tight">{adminRoute.label}</span>
              </Link>
            );
          })()}
        </div>
      </nav>
    </Fragment>
  );
}