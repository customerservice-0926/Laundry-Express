"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/60 text-sm font-medium text-slate-500">
        <div className="flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-white px-4 py-2 shadow-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
          <span>Verifying account...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/60 text-sm text-slate-500">
        <div className="text-center space-y-3 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm max-w-sm mx-4">
          <p className="font-medium text-slate-800">Signing in to your account...</p>
          <p className="text-xs text-slate-500">If you are not redirected automatically within a few seconds, click below.</p>
          <a
            href="/login"
            className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

