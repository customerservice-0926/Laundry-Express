"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

interface DashboardPageLayoutProps {
  activeSection: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardPageLayout({
  activeSection,
  title,
  subtitle,
  actions,
  children,
}: DashboardPageLayoutProps) {
  const { user, isAdmin, isLoading } = useAuth();
  const [hasMountedOnce, setHasMountedOnce] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      setHasMountedOnce(true);
    }
  }, [isLoading]);

  if (!hasMountedOnce && isLoading) {
    return <div className="h-96 rounded-3xl bg-slate-100 animate-pulse m-6" />;
  }

  const role = isAdmin ? "admin" : "customer";
  const displayName = user?.full_name || (isAdmin ? "Operations Admin" : "Valued Customer");
  const fallbackTitle = isAdmin ? "Operations Command Center" : "Customer Portal";

  return (
    <DashboardShell
      role={role}
      userName={displayName}
      activeSection={activeSection}
      title={title || fallbackTitle}
      subtitle={subtitle}
      badgeText={isAdmin ? "Operations Hub" : "Active Customer"}
      badgeVariant="primary"
      actions={actions}
    >
      {children}
    </DashboardShell>
  );
}
