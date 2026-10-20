"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  Star,
  Settings,
  Sliders,
  ListOrdered,
  Users,
  Package,
  Sparkles,
  Tag,
  MessageSquare,
  HelpCircle,
  User as UserIcon,
  ArrowLeft,
  X,
  Shirt,
} from "lucide-react";
import { MascotBadge } from "@/components/shared/mascot-badge";

export type DashboardRole = "admin" | "customer";

export interface DashboardSidebarProps {
  role: DashboardRole;
  userName?: string;
  activeSection?: string;
  onSelectSection?: (section: string) => void;
  ordersCount?: number;
  customersCount?: number;
  pendingReviewsCount?: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: string;
}

const CUSTOMER_NAV: NavItem[] = [
  { id: "overview", href: "/dashboard", label: "Dashboard Overview", icon: LayoutDashboard },
  { id: "orders", href: "/dashboard/orders", label: "My Orders & Tracking", icon: ShoppingBag },
  { id: "transactions", href: "/dashboard/transactions", label: "Payment History", icon: CreditCard },
  { id: "ratings", href: "/dashboard/ratings", label: "Ratings & Reviews", icon: Star },
  { id: "account_settings", href: "/dashboard/account", label: "Account Settings", icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { id: "overview", href: "/dashboard", label: "Overview", icon: Sliders },
  { id: "orders", href: "/dashboard/orders", label: "Orders", icon: ListOrdered, badgeKey: "orders" },
  { id: "customers", href: "/dashboard/customers", label: "Customers", icon: Users, badgeKey: "customers" },
  { id: "transactions", href: "/dashboard/transactions", label: "Transactions", icon: CreditCard },
  { id: "packages", href: "/dashboard/packages", label: "Packages & Bundles", icon: Package },
  { id: "additional_items", href: "/dashboard/additional-items", label: "Additional Items", icon: Shirt },
  { id: "detergents", href: "/dashboard/detergents", label: "Detergent Catalog", icon: Sparkles },
  { id: "coupons", href: "/dashboard/coupons", label: "Promo Coupons", icon: Tag },
  { id: "reviews", href: "/dashboard/reviews", label: "Review Moderation", icon: MessageSquare, badgeKey: "reviews" },
  { id: "faqs", href: "/dashboard/faqs", label: "FAQs & Terms Guarantees", icon: HelpCircle },
  { id: "settings", href: "/dashboard/settings", label: "Operations & Facility", icon: Settings },
  { id: "account_settings", href: "/dashboard/account", label: "Account Settings", icon: UserIcon },
];

export function DashboardSidebar({
  role,
  userName,
  activeSection,
  onSelectSection,
  ordersCount = 0,
  customersCount = 0,
  pendingReviewsCount = 0,
  mobileOpen,
  onCloseMobile,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const navItems = role === "admin" ? ADMIN_NAV : CUSTOMER_NAV;

  const getAdminBadge = (badgeKey?: string) => {
    if (badgeKey === "orders" && ordersCount > 0) return ordersCount;
    if (badgeKey === "customers" && customersCount > 0) return customersCount;
    if (badgeKey === "reviews" && pendingReviewsCount > 0) return pendingReviewsCount;
    return undefined;
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-64 h-screen bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-200 shrink-0 shadow-2xs lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <MascotBadge size="xs" />
              <div className="min-w-0">
                <span className="font-black text-slate-900 text-xs block truncate">
                  {role === "admin" ? "Admin Operations" : "Customer Portal"}
                </span>
                <span className="text-[11px] text-primary font-bold block truncate">
                  {userName || (role === "admin" ? "Operations Admin" : "Valued Customer")}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-2 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
            {role === "admin" ? "Operations & Admin" : "Customer Navigation"}
          </div>

          <nav className="space-y-1" aria-label="Dashboard Navigation">
            {navItems.map((item) => {
              const active = pathname === item.href || (activeSection && activeSection === item.id);
              const Icon = item.icon;
              const badge = item.badgeKey ? getAdminBadge(item.badgeKey) : undefined;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    onSelectSection?.(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 text-left ${
                    active ? "bg-primary text-white shadow-xs shadow-primary/25" : "text-slate-600 hover:bg-pink-50/70 hover:text-primary"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        active ? "bg-white text-primary" : "bg-primary text-white"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3.5 border-t border-slate-100 space-y-2 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-900 transition-colors pt-0.5 px-1"
          >
            <ArrowLeft className="h-3 w-3 shrink-0" />
            <span>Return to Live Site</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
