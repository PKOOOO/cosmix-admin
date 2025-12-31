"use client";

import {
  Settings,
  Package,
  BarChart3,
  List,
  CalendarCheck,
  CloudIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import axios from "@/lib/axios";
import Link from "next/link";

interface MobileBottomNavProps {
  hasSaloons: boolean;
}

export function MobileBottomNav({ hasSaloons }: MobileBottomNavProps) {
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

  // Define main navigation items for mobile
  const mobileRoutes = [
    {
      href: '/dashboard',
      label: 'Palvelutilastot',
      icon: BarChart3,
      active: pathname === '/dashboard',
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
      href: '/dashboard/bookings',
      label: 'Varaukset',
      icon: CalendarCheck,
      active: pathname === '/dashboard/bookings',
      disabled: !hasSaloons,
    },
    {
      href: '/dashboard/integration',
      label: 'Integration',
      icon: CloudIcon,
      active: pathname === '/dashboard/integration',
      disabled: !hasSaloons,
    },
  ];

  // Filter routes based on admin status and availability
  const availableRoutes = mobileRoutes.filter(route =>
    !route.disabled && (!(route as any).adminOnly || isAdmin)
  );

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border md:hidden"
      style={{ 
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)'
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {availableRoutes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex flex-col items-center justify-center min-w-0 flex-1 px-2 py-1 rounded-lg transition-colors",
              route.active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <route.icon className={cn(
              "h-5 w-5 mb-1",
              route.active ? "text-primary" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-xs font-medium truncate max-w-full",
              route.active ? "text-primary" : "text-muted-foreground"
            )}>
              {route.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
