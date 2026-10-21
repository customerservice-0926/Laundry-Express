"use client";

import { DashboardPageLayout } from "@/components/dashboard/dashboard-page-layout";
import { AdditionalItemsManager } from "@/components/admin/additional-items-manager";

export default function AdditionalItemsPage() {
  return (
    <DashboardPageLayout
      activeSection="additional_items"
      title="Specialty Wash & Additional Clothing Options"
      subtitle="Add, price, and customize specialty wash items (sports jerseys, uniforms, shoe care, bulky bedding) available at checkout"
    >
      <AdditionalItemsManager />
    </DashboardPageLayout>
  );
}
