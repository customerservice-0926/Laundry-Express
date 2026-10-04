"use client";

import * as React from "react";
import type { InvoiceData } from "./order-invoice-modal";
import { generateInvoiceHtml } from "@/lib/invoice/invoice-html-template";

interface OrderInvoiceCardProps {
  invoice: InvoiceData;
  className?: string;
}

export function OrderInvoiceCard({ invoice, className = "" }: OrderInvoiceCardProps) {
  const html = React.useMemo(() => generateInvoiceHtml(invoice), [invoice]);

  return (
    <div
      id="official-invoice-print-area"
      className={`official-invoice-card ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
