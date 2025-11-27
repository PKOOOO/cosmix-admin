"use client";

import {
  Settings,
  BarChart3,
  List,
  CalendarCheck,
  CloudIcon,
  Shield,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect, Fragment } from "react";
import axios from "@/lib/axios";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

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
      href: '/dashboard/categories',
      label: 'Categories',
      icon: List,
      active: pathname === '/dashboard/categories',
      disabled: !hasSaloons,
      adminOnly: false,
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

      <div className="md:hidden fixed top-4 left-4 z-50">
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerTrigger asChild>
            <Button variant="secondary" size="icon" className="shadow-lg rounded-full h-10 w-10 bg-background/80 backdrop-blur-sm border">
              <Menu className="h-5 w-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[60vh] w-full fixed bottom-0 left-0 rounded-t-2xl bg-background shadow-lg">
            <DrawerHeader className="flex items-center justify-between px-4 py-3 border-b">
              <DrawerTitle></DrawerTitle>
              <DrawerClose asChild>
                <button className="p-2 text-muted-foreground rounded-md hover:bg-accent">
                  ✕
                </button>
              </DrawerClose>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-1">
                {availableRoutes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.disabled ? "#" : route.href}
                    onClick={route.disabled ? (e) => e.preventDefault() : () => setIsDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      route.disabled
                        ? "text-muted-foreground cursor-not-allowed opacity-50"
                        : route.active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <route.icon className="h-5 w-5" />
                    <span className="font-medium">{route.label}</span>
                  </Link>
                ))}
                {!loading && isAdmin && (() => {
                  const adminRoute = adminRoutes[0];
                  const AdminIcon = adminRoute.icon;
                  return (
                    <Link
                      href={adminRoute.href}
                      onClick={() => setIsDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        adminRoute.active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <AdminIcon className="h-5 w-5" />
                      <span className="font-medium">{adminRoute.label}</span>
                    </Link>
                  );
                })()}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </Fragment>
  );
}