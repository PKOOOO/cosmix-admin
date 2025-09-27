"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

import { usePathname } from "next/navigation";

export function MainNav({
    className,
    ...props
}: React.HTMLAttributes<HTMLElement>) {
const pathname = usePathname();

    const routes = [
        {
            href: '/dashboard',
            label: 'Overview',
            active: pathname === '/dashboard',
        },
        {
            href: '/dashboard/services',
            label: 'Services',
            active: pathname === '/dashboard/services',
        },
        {
            href: '/dashboard/categories',
            label: 'Categories',
            active: pathname === '/dashboard/categories',
        },
        {
            href: '/dashboard/saloons',
            label: 'Saloons',
            active: pathname === '/dashboard/saloons',
        },
        {
            href: '/dashboard/bookings',
            label: 'Bookings',
            active: pathname === '/dashboard/bookings',
        },
        {
            href: '/dashboard/settings',
            label: 'Settings',
            active: pathname === '/dashboard/settings',
        },
    ];
    
    return (
        <nav
        className={cn("flex items-center space-x-4 lg:space-x-6", className)}
        >
        {routes.map((route) => (
            <Link
                key={route.href}
                href={route.href}
                className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    route.active ? "text-black dark:text-white" : "text-muted-foreground"
                )}
            >
                {route.label}
            </Link>
        ))}
        </nav>
    )
};