"use client";

import * as React from "react";
import Image from "next/image";
import { Star, CheckCircle, ZoomIn, Camera, Calendar } from "lucide-react";
import type { OrderReview } from "@/types";
import { formatDate } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";

interface ReviewCardProps {
  review: OrderReview;
  onPhotoClick?: (photoUrl: string) => void;
}

function getInitials(name?: string): string {
  if (!name || name === "Customer" || name === "Verified Customer") return "VC";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * ReviewCard Component
 *
 * Displays verified customer rating, feedback text, customer name, review date,
 * and up to 3 real laundry photo proofs with clickable preview modal.
 */
export function ReviewCard({ review, onPhotoClick }: ReviewCardProps) {
  const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null);

  const customerName = review.user?.full_name || review.customer_name || "Verified Customer";
  const initials = getInitials(customerName);

  const photoUrls = (review.photos && review.photos.length > 0)
    ? review.photos.map((p) => p.photo_url)
    : (review.photo_urls || []);

  const handlePhotoClick = (photoUrl: string) => {
    if (onPhotoClick) {
      onPhotoClick(photoUrl);
    } else {
      setSelectedPhoto(photoUrl);
    }
  };

  return (
    <>
      <div className="h-full p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-pink-200 transition-all duration-300 flex flex-col justify-between group">
        <div className="space-y-4">
          {/* Header: Customer Info & Rating */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Customer Initials Avatar */}
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 text-primary flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                {initials}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">
                  {customerName}
                </h4>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                  <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
                  <span>{formatDate(review.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Verified Badge */}
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
              <CheckCircle className="h-3 w-3 text-emerald-600" />
              <span>Verified Wash</span>
            </span>
          </div>

          {/* Star Rating */}
          <div className="flex items-center gap-1 pt-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= review.rating
                    ? "text-amber-400 fill-amber-400"
                    : "text-slate-200"
                }`}
              />
            ))}
            <span className="text-xs font-bold text-slate-700 ml-1.5">
              {review.rating}.0
            </span>
          </div>

          {/* Feedback Text */}
          <p className="text-sm text-slate-700 leading-relaxed font-normal">
            &ldquo;{review.comment}&rdquo;
          </p>

          {/* Customer Uploaded Photos */}
          {photoUrls.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-2">
                <Camera className="h-3 w-3 text-primary" />
                Customer Laundry Photo ({photoUrls.length}/3)
              </span>
              <div className="flex items-center gap-2.5">
                {photoUrls.map((photoUrl, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handlePhotoClick(photoUrl)}
                    className="relative h-16 w-16 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs cursor-pointer group/img shrink-0 hover:ring-2 hover:ring-primary transition-all"
                    title="Click to view full photo proof"
                  >
                    <Image
                      src={photoUrl}
                      alt={`Laundry review photo ${index + 1}`}
                      fill
                      sizes="64px"
                      unoptimized
                      className="object-cover group-hover/img:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-slate-900/25 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <ZoomIn className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Guarantee */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="text-slate-500 font-medium">Doorstep Pickup &amp; Delivery</span>
          <span className="text-emerald-700 font-bold bg-emerald-50/70 px-2 py-0.5 rounded-md">
            24h Turnaround
          </span>
        </div>
      </div>

      {/* Fallback High-Resolution Photo Preview Dialog if no parent handler */}
      {!onPhotoClick && selectedPhoto && (
        <Dialog
          open={!!selectedPhoto}
          onOpenChange={() => setSelectedPhoto(null)}
          title="Verified Customer Laundry Photo"
          description="Uploaded by customer upon doorstep order completion."
          size="md"
        >
          <div className="relative h-80 sm:h-96 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
            <Image
              src={selectedPhoto}
              alt="Full size customer laundry photo proof"
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              unoptimized
              className="object-contain"
            />
          </div>
        </Dialog>
      )}
    </>
  );
}

export default ReviewCard;
