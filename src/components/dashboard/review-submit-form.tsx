"use client";

import * as React from "react";
import Image from "next/image";
import { Star, Camera, CheckCircle2, AlertCircle, Plus, Sparkles, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/image-compressor";
import type { Order, OrderReview } from "@/types";

interface ReviewSubmitFormProps {
  orders?: Order[];
  reviewedOrderIds?: Set<string>;
  defaultOrderId?: string;
  onReviewSubmitted: (newReview: OrderReview) => void;
}

export function ReviewSubmitForm({ orders = [], reviewedOrderIds: externalReviewedIds, defaultOrderId, onReviewSubmitted }: ReviewSubmitFormProps) {
  const completedOrders = React.useMemo(() => orders.filter((o) => o.order_status === "completed"), [orders]);

  // Use parent-provided set if available (avoids duplicate API call)
  const eligibleOrders = React.useMemo(() => {
    if (!externalReviewedIds) return completedOrders;
    return completedOrders.filter((o) => !externalReviewedIds.has(o.id) && !externalReviewedIds.has(o.order_number));
  }, [completedOrders, externalReviewedIds]);

  const [selectedOrderId, setSelectedOrderId] = React.useState<string>("");
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-select eligible order or defaultOrderId
  React.useEffect(() => {
    if (defaultOrderId) {
      const matched = eligibleOrders.find((o) => o.id === defaultOrderId || o.order_number === defaultOrderId);
      if (matched) {
        setSelectedOrderId(matched.id);
        return;
      }
    }
    if (eligibleOrders.length > 0 && !eligibleOrders.find((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(eligibleOrders[0].id);
    }
  }, [eligibleOrders, selectedOrderId, defaultOrderId]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (photos.length + files.length > 3) {
      setError("Maximum 3 photos per review.");
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const uploadTasks = files.map(async (file, idx) => {
        if (file.size > 5 * 1024 * 1024) throw new Error(`"${file.name}" exceeds 5MB.`);
        if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
        const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
        const fd = new FormData();
        fd.append("file", compressed);
        fd.append("bucket", "review-photos");
        fd.append("entityId", selectedOrderId || "review");
        fd.append("subType", String(photos.length + idx + 1));
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.");
        return data.url as string;
      });
      const uploaded = await Promise.all(uploadTasks);
      setPhotos((prev) => [...prev, ...uploaded].slice(0, 3));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !selectedOrderId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selectedOrderId, rating, comment: comment.trim(), photoUrls: photos }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.review) throw new Error(data.error || "Failed to submit.");
      onReviewSubmitted(data.review);
      setComment("");
      setPhotos([]);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-pink-200 shadow-md space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-primary-pale text-primary flex items-center justify-center">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-base">Rate a Completed Order</h3>
          <span className="text-[11px] text-slate-500">1–5 Stars · up to 3 photos · verified experience</span>
        </div>
      </div>

      {submitted && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Thank you! Your review has been published.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Completed Order</label>
            {eligibleOrders.length === 0 ? (
              <div className="p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                {completedOrders.length === 0 ? "No completed orders yet." : "All completed orders already reviewed."}
              </div>
            ) : (
              <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)} className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white">
                {eligibleOrders.map((ord) => (
                  <option key={ord.id} value={ord.id}>Order #{ord.order_number} · {ord.bag_count} bag(s)</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Star Rating</label>
            <div className="flex items-center gap-1.5 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)} className="p-1 hover:scale-110 transition-transform cursor-pointer">
                  <Star className={`h-6 w-6 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                </button>
              ))}
              <span className="text-xs font-bold text-slate-700 ml-1">{rating}/5</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Your Feedback</label>
          <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was the folding, fragrance, and delivery?" className="w-full p-3 text-xs rounded-xl border border-slate-200" required />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Camera className="h-3.5 w-3.5 text-primary" /><span>Photos (optional, max 3)</span></label>
            <span className="text-[11px] text-slate-400">{photos.length}/3</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {photos.map((url, idx) => (
              <div key={idx} className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-xs">
                <Image src={url} alt={`Review photo ${idx + 1}`} fill sizes="80px" unoptimized className="object-cover" />
                <button type="button" onClick={() => setPhotos((p) => p.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 cursor-pointer"><X className="h-3 w-3" /></button>
              </div>
            ))}
            {photos.length < 3 && (
              <button type="button" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="h-20 w-20 rounded-2xl border-2 border-dashed border-slate-300 hover:border-primary flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-primary cursor-pointer disabled:opacity-50">
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Plus className="h-5 w-5" />}
                <span className="text-[9px] font-bold">{isUploading ? "Uploading" : "Add Photo"}</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoSelect} className="hidden" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isUploading || isSubmitting || !selectedOrderId || eligibleOrders.length === 0} className="bg-primary hover:bg-primary-dark text-white text-xs gap-2 cursor-pointer">
            {isSubmitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Submitting...</span></> : <><Plus className="h-3.5 w-3.5" /><span>Submit Review</span></>}
          </Button>
        </div>
      </form>
    </div>
  );
}
