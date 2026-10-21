import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { OrderPayView } from "@/components/order/order-pay-view";
import { OrderService } from "@/lib/services/order-service";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock } from "lucide-react";
import { stripe } from "@/lib/stripe/stripe-server";
import { APP_CONFIG } from "@/lib/constants";

interface OrderPayPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ session_id?: string }>;
}

export async function generateMetadata({ params }: OrderPayPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Pay Order #${id} — Laundry Express`,
    description: "Review your order specifications, add a tip, and complete payment securely.",
  };
}

export default async function OrderPayPage({ params, searchParams }: OrderPayPageProps) {
  const { id } = await params;
  const resolvedQuery = (await searchParams) || {};
  const sessionId = typeof resolvedQuery.session_id === "string" ? resolvedQuery.session_id.trim() : "";
  const order = await OrderService.getOrderByNumber(id).catch(() => null);

  let sessionExpired = false;
  let sessionMismatch = false;

  if (order && order.payment_status !== "paid" && sessionId && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const matches =
        session.metadata?.order_number === order.order_number ||
        session.metadata?.order_id === order.id;
      if (!matches) {
        sessionMismatch = true;
      } else if (
        session.status === "expired" ||
        (session.expires_at && session.expires_at < Math.floor(Date.now() / 1000))
      ) {
        sessionExpired = true;
      }
    } catch {
      // If Stripe retrieve fails due to test mode or temporary glitch, fallback gracefully
    }
  }

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
        ) : sessionExpired ? (
          <div className="max-w-md mx-auto p-8 bg-white rounded-3xl border border-amber-200 text-center space-y-4 shadow-xs">
            <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Clock className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black text-slate-900">Payment Link Expired</h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              For your account security, checkout links are valid for <strong>30 minutes</strong>. Order <strong>#{order.order_number}</strong> is still confirmed on our schedule.
            </p>
            <p className="text-xs text-slate-500">
              Please call <strong>{APP_CONFIG.supportPhone}</strong> or email <strong>{APP_CONFIG.supportEmail}</strong> to receive a fresh payment checkout link.
            </p>
            <div className="pt-2">
              <Link href="/">
                <Button variant="outline" size="sm" className="w-full">
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
        ) : sessionMismatch ? (
          <div className="max-w-md mx-auto p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-4 shadow-xs">
            <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black text-slate-900">Payment Session Mismatch</h1>
            <p className="text-xs text-slate-600">
              This checkout session does not match order <strong>#{order.order_number}</strong>. Please use the original payment link sent to your email.
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
          <OrderPayView order={order} sessionId={sessionId} />
        )}
      </main>
      <Footer />
    </div>
  );
}
