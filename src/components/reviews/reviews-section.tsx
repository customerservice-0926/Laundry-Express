"use client";

import * as React from "react";
import Image from "next/image";
import { Star, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { ReviewCard } from "./review-card";
import { Dialog } from "@/components/ui/dialog";
import type { OrderReview } from "@/types";

export function ReviewsSection() {
  const [reviews, setReviews] = React.useState<OrderReview[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/reviews?public=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.reviews && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && reviews.length === 0) return null;

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1)
    : "5.0";

  // Use carousel only when 3+ reviews exist for continuous marquee
  const showCarousel = reviews.length >= 3;
  const looped = showCarousel ? [...reviews, ...reviews] : reviews;

  return (
    <section className="py-20 lg:py-24 bg-gradient-to-b from-white via-pink-50/30 to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-pink-100/80 text-primary text-xs font-bold border border-pink-200/60 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 fill-primary text-primary" />
            <span>Verified Customer Stories</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Real Reviews, Spotless Results
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Authentic doorstep feedback from neighbors who trust us with their wash &amp; fold.
          </p>

          {/* Average Rating & Total Reviews Trust Scorecard */}
          <div className="pt-2">
            <div className="inline-flex flex-wrap items-center justify-center gap-4 sm:gap-6 px-5 py-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              {/* Average Score */}
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
                  {averageRating}
                </span>
                <div className="flex flex-col items-start">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 mt-0.5">
                    Average Rating
                  </span>
                </div>
              </div>

              <div className="hidden sm:block h-8 w-px bg-slate-200" />

              {/* Total Reviews Count */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 block leading-tight">
                    {totalReviews} Verified {totalReviews === 1 ? "Review" : "Reviews"}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    100% Completed Orders
                  </span>
                </div>
              </div>

              <div className="hidden sm:block h-8 w-px bg-slate-200" />

              {/* Fast Delivery Guarantee */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>24h Turnaround</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Content Area */}
      <div className="mt-12 sm:mt-14">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-slate-100/70 border border-slate-200/60 animate-pulse" />
            ))}
          </div>
        ) : showCarousel ? (
          <div className="relative w-full">
            {/* Left and right fade gradient overlays */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-32 z-10 bg-gradient-to-r from-white via-white/80 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-32 z-10 bg-gradient-to-l from-white via-white/80 to-transparent" />

            <div className="reviews-carousel flex gap-6 w-max px-4">
              {looped.map((rev, i) => (
                <div key={`${rev.id}-${i}`} className="w-80 sm:w-96 shrink-0">
                  <ReviewCard review={rev} onPhotoClick={setSelectedPhoto} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Responsive Centered Layout for 1 or 2 reviews */
          <div
            className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-6 ${
              reviews.length === 1
                ? "max-w-md mx-auto grid-cols-1"
                : "max-w-4xl mx-auto grid-cols-1 md:grid-cols-2"
            }`}
          >
            {reviews.map((rev) => (
              <div key={rev.id} className="h-full">
                <ReviewCard review={rev} onPhotoClick={setSelectedPhoto} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full-Screen Customer Laundry Photo Preview Modal */}
      {selectedPhoto && (
        <Dialog
          open={!!selectedPhoto}
          onOpenChange={() => setSelectedPhoto(null)}
          title="Verified Customer Laundry Photo"
          description="Customer photo proof uploaded upon doorstep delivery."
          size="md"
        >
          <div className="relative h-80 sm:h-96 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
            <Image
              src={selectedPhoto}
              alt="Verified customer laundry photo proof"
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              unoptimized
              className="object-contain"
            />
          </div>
        </Dialog>
      )}

    </section>
  );
}

export default ReviewsSection;
