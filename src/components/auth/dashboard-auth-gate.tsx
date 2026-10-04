"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [hasVerifiedOnce, setHasVerifiedOnce] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        setHasVerifiedOnce(true);
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Only display full-page loading placeholder on initial verification, never on tab refocus
  if (!hasVerifiedOnce && (isLoading || !isAuthenticated)) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">Verifying your account...</div>;
  }

  return children;
}

