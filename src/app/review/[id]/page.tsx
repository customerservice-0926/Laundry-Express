import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ShieldAlert, Clock, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { DirectReviewView } from "@/components/reviews/direct-review-view";
import { OrderService } from "@/lib/services/order-service";
import { ReviewService } from "@/lib/services/review-service";
import { verifyReviewToken } from "@/lib/services/review-token-service";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Review Your Order | Laundry Express",
  description: "Share your rating and feedback for your delivered laundry order.",
  robots: { index: false, follow: false },
};

interface ReviewPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function ReviewPage({ params, searchParams }: ReviewPageProps) {
  const { id } = await params;
  const { token } = await searchParams;

  const tokenVerification = verifyReviewToken(token || "");
  const isTokenMatching = Boolean(
    tokenVerification.valid && (tokenVerification.orderNumber === id || tokenVerification.orderId === id)
  );

  if (!isTokenMatching) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="grow flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full rounded-3xl bg-white border border-rose-200/80 shadow-xl p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900">Review Link Expired or Invalid</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                This secure review link has expired, is invalid, or was already accessed. You can still sign in to your dashboard to review completed orders.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Link href="/login" className="w-full">
                <Button className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl">
                  Sign In to Dashboard
                </Button>
              </Link>
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full border-slate-200 text-slate-700 py-2.5 rounded-xl">
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const order = await OrderService.getOrderByNumber(id);
  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="grow flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200 shadow-xl p-8 text-center space-y-4">
            <h1 className="text-xl font-black text-slate-900">Order Not Found</h1>
            <p className="text-xs text-slate-500">We could not locate this order in our system.</p>
            <Link href="/" className="inline-block pt-2">
              <Button className="bg-primary text-white font-bold rounded-xl px-6">Return Home</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (order.order_status !== "completed") {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="grow flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full rounded-3xl bg-white border border-amber-200/80 shadow-xl p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900">Order Still in Progress</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Order <span className="font-mono font-bold text-slate-700">{order.order_number}</span> is currently being processed. You can review your service once delivery is completed.
              </p>
            </div>
            <Link href={`/track?orderId=${encodeURIComponent(order.order_number)}`} className="inline-block w-full pt-2">
              <Button className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl">
                Track Live Order Status
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const existingReview = await ReviewService.getReviewByOrder(order.id);
  if (existingReview) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="grow flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full rounded-3xl bg-white border border-pink-200/80 shadow-xl p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900">Review Already Received</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Thank you! You have already submitted a review for Order{" "}
                <span className="font-mono font-bold text-slate-700">{order.order_number}</span>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Link href="/order" className="w-full">
                <Button className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl">
                  Book Next Pickup <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full border-slate-200 text-slate-700 py-2.5 rounded-xl">
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      <Navbar />
      <main className="grow flex items-center justify-center px-4 py-12 sm:py-16">
        <DirectReviewView
          orderNumber={order.order_number}
          customerName={order.customer_name || "Valued Customer"}
          completedDate={order.delivery_date || undefined}
          token={token || ""}
        />
      </main>
      <Footer />
    </div>
  );
}
