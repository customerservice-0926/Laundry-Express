"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { LogOut, LogIn, LayoutDashboard, Settings, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
  navLinks: Array<{ href: string; label: string }>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  userDisplayName: string;
  userAvatarUrl?: string;
  userEmail?: string;
  onLogout: () => void;
}

export function NavbarMobileDrawer({
  isOpen,
  onClose,
  pathname,
  navLinks,
  isAuthenticated,
  isAdmin,
  userDisplayName,
  userAvatarUrl,
  onLogout,
}: NavbarMobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div id="site-mobile-menu" className="lg:hidden bg-white/98 backdrop-blur-xl border-b border-slate-200 shadow-2xl animate-slide-up px-4 py-4 space-y-3">
      {isAuthenticated && (
        <div className="flex items-center gap-3 p-3 bg-pink-50/60 rounded-2xl border border-pink-100/80">
          {userAvatarUrl ? (
            <div className="relative h-10 w-10 rounded-full overflow-hidden border border-pink-300 shrink-0">
              <Image src={userAvatarUrl} alt={userDisplayName} fill sizes="40px" className="object-cover" />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-black shrink-0">
              {userDisplayName[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-black text-sm text-slate-900 truncate">{userDisplayName}</p>
            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-primary border border-pink-200 uppercase">
              {isAdmin ? "Admin" : "Customer"}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1 text-sm font-semibold">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`px-3 py-2.5 rounded-xl transition-all ${
                isActive ? "bg-primary text-white font-bold" : "text-slate-700 hover:bg-slate-100 hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-1">
        {isAuthenticated ? (
          <>
            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-800 hover:bg-pink-50 hover:text-primary font-bold text-xs"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/dashboard/orders"
              onClick={onClose}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-800 hover:bg-pink-50 hover:text-primary font-bold text-xs"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>My Orders</span>
            </Link>
            <Link
              href="/dashboard/account"
              onClick={onClose}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-800 hover:bg-pink-50 hover:text-primary font-bold text-xs"
            >
              <Settings className="h-4 w-4" />
              <span>Settings &amp; Security</span>
            </Link>
            <button
              type="button"
              onClick={() => { onClose(); onLogout(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs text-left cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link href="/login" onClick={onClose}>
              <Button variant="outline" size="sm" className="w-full text-xs font-bold">
                <LogIn className="h-3.5 w-3.5 mr-1" />
                <span>Sign In</span>
              </Button>
            </Link>
            <Link href="/register" onClick={onClose}>
              <Button variant="hero" size="sm" className="w-full text-xs font-bold shadow-sm">
                <span>Register</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
