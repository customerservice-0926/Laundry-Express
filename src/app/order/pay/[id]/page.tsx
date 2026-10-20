import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { OrderPayView } from "@/components/order/order-pay-view";
import { OrderService } from "@/lib/services/order-service";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface OrderPayPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: OrderPayPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Pay Order #${id} — Laundry Express`,
    description: "Review your order specifications, add a tip, and complete payment securely.",
  };
}

export default async function OrderPayPage({ params }: OrderPayPageProps) {
  const { id } = await params;
  const order = await OrderService.getOrderByNumber(id).catch(() => null);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pt-16 sm:pt-20">
      <Navbar />
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        {!order ? (
          <div className="max-w-md mx-auto p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-xs">
            <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black text-slate-900">Order Not Found</h1>
            <p className="text-xs text-slate-600">
              We couldn&#39;t locate order identifier <strong>#{id}</strong>. Please check your link or contact support.
            </p>
            <div className="pt-2">
              <Link href="/">
                <Button variant="outline" size="sm" className="w-full">
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <OrderPayView order={order} />
        )}
      </main>
      <Footer />
    </div>
  );
}
