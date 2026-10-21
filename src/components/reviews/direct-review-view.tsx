"use client";

import * as React from "react";
import Link from "next/link";
import { Star, Upload, X, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { MascotBadge } from "@/components/shared/mascot-badge";
import { Button } from "@/components/ui/button";

interface DirectReviewViewProps {
  orderNumber: string;
  customerName: string;
  completedDate?: string;
  planName?: string;
  token: string;
}

const RATING_LABELS: Record<number, string> = {
  5: "Outstanding! Fresh, clean & perfectly folded", 4: "Great service! Very satisfied",
  3: "Good — met standard expectations", 2: "Fair — had a few minor issues", 1: "Disappointing — needs improvement",
};

export function DirectReviewView({ orderNumber, customerName, completedDate, token }: DirectReviewViewProps) {
  const [rating, setRating] = React.useState(5);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (photos.length + files.length > 3) {
      setError("Maximum 3 photos permitted per review.");
      return;
    }
    Array.from(files).slice(0, 3 - photos.length).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) return setError("Photos must be under 5MB each.");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return setError("Only JPG, PNG, and WebP images are allowed.");
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setPhotos((prev) => [...prev, uploadEvent.target!.result as string].slice(0, 3));
          setPhotoFiles((prev) => [...prev, file].slice(0, 3));
          setError("");
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      return setError("Please write a quick comment about your fresh laundry experience.");
    }
    setIsSubmitting(true);
    setError("");
    try {
      const photoUrls: string[] = [];
      for (const [index, file] of photoFiles.entries()) {
        const form = new FormData();
        form.append("file", file);
        form.append("bucket", "review-photos");
        form.append("entityId", orderNumber);
        form.append("subType", String(index + 1));
        form.append("token", token);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success || !uploadData.url) {
          throw new Error(uploadData.error || "Unable to upload review photo proof.");
        }
        photoUrls.push(uploadData.url);
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderNumber,
          rating,
          comment: comment.trim(),
          photoUrls,
          token,
          customerName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to submit review.");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto rounded-3xl bg-white border border-pink-200/80 shadow-2xl p-8 sm:p-10 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Review Submitted!</h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
            Thank you, <span className="font-bold text-slate-800">{customerName}</span>! Your review for Order{" "}
            <span className="font-mono font-semibold text-primary">{orderNumber}</span> has been published.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-pink-50/60 border border-pink-100 flex items-center justify-center gap-3">
          <MascotBadge size="sm" withSpeech speechText="You made our day! ✨" />
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/order" className="w-full sm:w-auto">
            <Button className="w-full bg-primary hover:bg-primary-dark text-white font-bold px-6 py-2.5 rounded-xl">
              Schedule Next Pickup <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold px-6 py-2.5 rounded-xl">
              Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const activeRating = hoverRating || rating;

  return (
    <div className="max-w-xl mx-auto rounded-3xl bg-white border border-pink-100 shadow-2xl p-6 sm:p-9 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider block">Service Rating</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">How was your laundry?</h1>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {orderNumber}
          </span>
          {completedDate && <span className="block text-[11px] text-slate-400 mt-1">Delivered {completedDate}</span>}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Overall Rating</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 rounded-lg transition-transform hover:scale-110 active:scale-95 focus:outline-hidden"
              >
                <Star
                  className={`h-8 w-8 sm:h-9 sm:w-9 transition-colors ${
                    star <= activeRating ? "fill-amber-400 text-amber-400 drop-shadow-sm" : "fill-slate-100 text-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-1.5 h-4">{RATING_LABELS[activeRating]}</p>
        </div>

        <div>
          <label htmlFor="review-comment" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Your Feedback
          </label>
          <textarea
            id="review-comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`Hi ${customerName.split(" ")[0] || "there"}, tell us about the wash freshness, cleanliness, or folding...`}
            className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            maxLength={1000}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Laundry Photos (Optional, Max 3)</label>
            <span className="text-xs text-slate-400">{photos.length}/3 attached</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {photos.length < 3 && (
              <label className="aspect-square rounded-2xl border-2 border-dashed border-pink-200 hover:border-primary bg-pink-50/30 hover:bg-pink-50/60 flex flex-col items-center justify-center cursor-pointer transition-all p-2 text-center group">
                <Upload className="h-5 w-5 text-primary group-hover:scale-110 transition-transform mb-1" />
                <span className="text-[11px] font-bold text-primary">Upload Photo</span>
                <span className="text-[9px] text-slate-400">JPG/PNG/WebP</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/25 transition-all"
        >
          {isSubmitting ? "Publishing Review..." : "Publish Review"}
        </Button>
      </form>
    </div>
  );
}
