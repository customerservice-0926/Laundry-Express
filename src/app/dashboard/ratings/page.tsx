"use client";

import * as React from "react";
import Image from "next/image";
import { Star, PenLine, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReviewSubmitForm } from "@/components/dashboard/review-submit-form";
import { DashboardPageLayout } from "@/components/dashboard/dashboard-page-layout";
import type { Order, OrderReview } from "@/types";

export default function CustomerRatingsPage() {
  const [reviews, setReviews] = React.useState<OrderReview[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [defaultOrderId, setDefaultOrderId] = React.useState<string>("");

  React.useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams(window.location.search);
    const orderParam = params.get("order_id");
    if (orderParam) {
      setDefaultOrderId(orderParam);
      setShowForm(true);
    }

    fetch("/api/reviews")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && Array.isArray(data?.reviews)) setReviews(data.reviews);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingReviews(false);
      });

    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && Array.isArray(data?.orders)) setOrders(data.orders);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const reviewedOrderIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of reviews) {
      if (r.order_id) set.add(r.order_id);
    }
    return set;
  }, [reviews]);

  const completedOrders = React.useMemo(
    () => orders.filter((o) => o.order_status === "completed"),
    [orders]
  );

  const canReview = completedOrders.some((o) => !reviewedOrderIds.has(o.id) && !reviewedOrderIds.has(o.order_number));

  const handleReviewSubmitted = (newReview: OrderReview) => {
    setReviews((prev) => [newReview, ...prev]);
    setShowForm(false);
  };

  const getOrderLabel = (orderId: string) => {
    const match = orders.find((o) => o.id === orderId || o.order_number === orderId);
    return match ? `Order #${match.order_number}` : orderId.startsWith("LX-") ? `Order #${orderId}` : `Order #${orderId.slice(0, 8)}`;
  };

  return (
    <DashboardPageLayout
      activeSection="ratings"
      title="Ratings & Reviews"
      subtitle="Share your experience with neighbors"
    >
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Header row with toggle button */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900 text-base">Your Reviews</h3>
            <p className="text-xs text-slate-500 mt-0.5">Only completed orders are eligible for a review.</p>
          </div>
          {canReview && (
            <Button
              variant={showForm ? "outline" : "hero"}
              size="sm"
              onClick={() => setShowForm((v) => !v)}
              className="gap-2 font-bold"
            >
              {showForm ? (
                <><X className="h-3.5 w-3.5" /><span>Cancel</span></>
              ) : (
                <><PenLine className="h-3.5 w-3.5" /><span>Write a Review</span></>
              )}
            </Button>
          )}
        </div>

        {/* Collapsible review form */}
        {showForm && (
          <ReviewSubmitForm
            orders={orders}
            reviewedOrderIds={reviewedOrderIds}
            defaultOrderId={defaultOrderId}
            onReviewSubmitted={handleReviewSubmitted}
          />
        )}

        {/* Loading skeletons for instant perceived performance */}
        {isLoadingReviews && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-28 bg-slate-200 rounded" />
                  <div className="h-4 w-16 bg-slate-100 rounded-full" />
                </div>
                <div className="h-3 w-3/4 bg-slate-100 rounded" />
                <div className="h-3 w-1/2 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Past reviews list */}
        {!isLoadingReviews && reviews.length === 0 && (
          <div className="p-10 text-center rounded-3xl bg-white border border-slate-200 text-slate-400 text-xs">
            {completedOrders.length === 0
              ? "No completed orders yet. Reviews are available once an order is delivered."
              : "No reviews submitted yet. Use \"Write a Review\" above to share your feedback."}
          </div>
        )}

        {reviews.map((rev) => (
          <div key={rev.id} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < rev.rating ? "fill-amber-400" : "text-slate-200"}`} />
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-800">Verified Experience</span>
              </div>
              <Badge variant={rev.status === "approved" ? "success" : "warning"} className="text-[10px] uppercase font-bold">
                {rev.status}
              </Badge>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">&ldquo;{rev.comment}&rdquo;</p>

            {(() => {
              const urls = (rev.photo_urls && rev.photo_urls.length > 0)
                ? rev.photo_urls
                : (rev.photos?.map((p) => p.photo_url) || []);
              if (!urls.length) return null;
              return (
                <div className="flex gap-3 pt-1">
                  {urls.map((url, i) => (
                    <div key={i} className="relative h-16 w-16 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                      <Image src={url} alt="Review photo" fill sizes="64px" unoptimized className="object-cover" />
                    </div>
                  ))}
                </div>
              );
            })()}

            <p className="text-[11px] text-slate-400 font-mono">
              {getOrderLabel(rev.order_id)}
            </p>
          </div>
        ))}
      </div>
    </DashboardPageLayout>
  );
}
