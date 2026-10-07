"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, LogIn, LayoutDashboard, Settings, ShoppingBag, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { NavbarMobileDrawer } from "@/components/shared/navbar-mobile-drawer";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/pricing", label: "Plans & Pricing" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/contact", label: "Contact" },
  ];

  const userDisplayName = user?.full_name || user?.email?.split("@")[0] || "Account";
  const userAvatarUrl = user?.avatar_url;

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-primary shadow-lg shadow-pink-900/15 border-b border-pink-700/30 text-white backdrop-blur-md"
          : "bg-transparent text-slate-900 border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-1 group">
            <div className="relative h-14 w-14 transition-transform group-hover:scale-95 duration-200 shrink-0">
              <Image src="/brand/hero.jpeg" alt="Laundry Express" width={80} height={80} priority />
            </div>
            <div>
              <span className={`font-black text-xl tracking-tight ${scrolled ? "text-white" : "text-slate-900"}`}>
                Laundry<span className={scrolled ? "text-pink-200" : "text-primary"}> Express</span>
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-all duration-200 ${
                    scrolled
                      ? isActive ? "text-white font-black drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "text-pink-100 hover:text-white"
                      : isActive ? "text-primary font-black" : "text-slate-700 hover:text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            {!mounted || !isAuthenticated ? (
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs font-bold flex items-center gap-1.5 ${scrolled ? "text-white hover:bg-white/15" : "text-slate-700 hover:text-primary"}`}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Button>
              </Link>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((p) => !p)}
                  className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                    scrolled ? "bg-white/20 text-white hover:bg-white/30 border border-white/20" : "bg-white text-slate-800 hover:bg-slate-50 border border-slate-200/80"
                  }`}
                >
                  {userAvatarUrl ? (
                    <div className="relative h-7 w-7 rounded-full overflow-hidden border border-white/50 shrink-0">
                      <Image src={userAvatarUrl} alt={userDisplayName} fill sizes="28px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black shrink-0">
                      {userDisplayName[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="truncate max-w-[120px] font-bold">{userDisplayName}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${userDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200/90 py-2 z-50 text-xs animate-in fade-in-50 zoom-in-95">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="font-black text-slate-900 truncate">{userDisplayName}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-50 text-primary border border-pink-100 uppercase">
                        {isAdmin ? "Administrator" : "Customer"}
                      </span>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <Link
                        href="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-pink-50/60 hover:text-primary transition-colors font-semibold"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>{isAdmin ? "Admin Overview" : "Dashboard Overview"}</span>
                      </Link>
                      <Link
                        href="/dashboard/orders"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-pink-50/60 hover:text-primary transition-colors font-semibold"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        <span>Order Pipeline</span>
                      </Link>
                      <Link
                        href="/dashboard/account"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-pink-50/60 hover:text-primary transition-colors font-semibold"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Account &amp; Addresses</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => { setUserDropdownOpen(false); logout(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors font-semibold cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Link href="/order">
              <Button
                variant="hero"
                size="sm"
                className={scrolled ? "bg-white text-primary hover:bg-pink-50 shadow-md font-bold text-xs" : "shadow-md shadow-pink-500/25 text-xs font-bold"}
              >
                Book Pickup
              </Button>
            </Link>
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <Link href="/order">
              <Button variant="hero" size="sm" className={scrolled ? "bg-white text-primary text-xs font-bold" : "text-xs font-bold shadow-sm"}>
                Book
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((p) => !p)}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${scrolled ? "text-white hover:bg-white/15" : "text-slate-800 hover:bg-slate-100"}`}
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="site-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <NavbarMobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        pathname={pathname}
        navLinks={navLinks}
        isAuthenticated={mounted && isAuthenticated}
        isAdmin={isAdmin}
        userDisplayName={userDisplayName}
        userAvatarUrl={userAvatarUrl}
        userEmail={user?.email}
        onLogout={logout}
      />
    </header>
  );
}

export const SiteHeader = Navbar;
export default Navbar;
