"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tag, ShoppingBag, ShieldCheck } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isPrimary?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Home",
    href: "/",
    icon: Home,
  },
  {
    name: "Plans & Bags",
    href: "/pricing",
    icon: Tag,
  },
  {
    name: "Order",
    href: "/order",
    icon: ShoppingBag,
    isPrimary: true,
  },
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: ShieldCheck,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      aria-label="Mobile Bottom App Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_25px_rgba(0,0,0,0.07)]"
    >
      <div className="max-w-md mx-auto px-4 py-1.5 flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={`Go to ${item.name}`}
                className="relative -top-3 flex flex-col items-center group focus:outline-none focus:ring-2 focus:ring-primary rounded-full"
              >
                <div className="h-12 w-12 rounded-full bg-primary hover:bg-primary-dark flex items-center justify-center text-white shadow-lg shadow-primary/40 group-active:scale-95 transition-all">
                  <Icon className="h-5 w-5 animate-pulse" />
                </div>
                <span className="text-[10px] font-bold text-primary mt-0.5">
                  {item.name}
                </span>
                <span className="sr-only">(Opens booking checkout)</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center min-h-11 min-w-14 px-2 py-1 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                isActive
                  ? "text-primary font-bold"
                  : "text-slate-600 font-medium hover:text-slate-800"
              }`}
            >
              <Icon
                className={`h-5 w-5 mb-1 transition-transform ${
                  isActive ? "scale-110 text-primary" : "text-slate-500"
                }`}
              />
              <span className="text-[11px] leading-tight tracking-tight">
                {item.name}
              </span>
              {isActive ? (
                <span className="h-1 w-1 rounded-full bg-primary mt-0.5" />
              ) : (
                <span className="h-1 w-1 mt-0.5 opacity-0" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
