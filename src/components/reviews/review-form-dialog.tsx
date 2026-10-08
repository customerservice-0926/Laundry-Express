"use client";

import * as React from "react";
import { Star, Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ReviewFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  onSubmitted: () => void;
}

export function ReviewFormDialog({
  open,
  onOpenChange,
  orderNumber,
  onSubmitted,
}: ReviewFormDialogProps) {
  const [rating, setRating] = React.useState<number>(5);
  const [comment, setComment] = React.useState<string>("");
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");
  const [success, setSuccess] = React.useState<boolean>(false);

  const resetForm = React.useCallback(() => {
    setRating(5);
    setComment("");
    setPhotos([]);
    setPhotoFiles([]);
    setError("");
    setSuccess(false);
  }, []);

  React.useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (photos.length + files.length > 3) {
      setError("Maximum 3 photos permitted per review.");
      return;
    }

    // Process up to remaining slots
    Array.from(files).slice(0, 3 - photos.length).forEach((file) => {
      // Validate 5MB cap & MIME
      if (file.size > 5 * 1024 * 1024) {
        setError("Photos must be under 5MB each.");
        return;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Only JPG, PNG, and WebP images are allowed.");
        return;
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
      setError("Please write a brief comment about your laundry service.");
      return;
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
        const uploadResponse = await fetch("/api/upload", { method: "POST", body: form });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadData.success || !uploadData.url) {
          throw new Error(uploadData.error || "Unable to upload a review photo.");
        }
        photoUrls.push(uploadData.url);
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderNumber, rating, comment: comment.trim(), photoUrls }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to submit your review.");
      setSuccess(true);
      window.setTimeout(() => {
        resetForm();
        onOpenChange(false);
        onSubmitted();
      }, 1400);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit your review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Write a Service Review"
      description={`Order ${orderNumber} • Share your feedback & photos`}
    >
      {success ? (
        <div className="text-center py-6 space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h4 className="font-bold text-base text-slate-900">Review Submitted for Moderation!</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Thank you! To ensure authentic feedback, your review and photos will appear publicly once approved by our admin team.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Service Rating
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-7 w-7 ${
                      star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200"
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-slate-600 ml-2">{rating} of 5 Stars</span>
            </div>
          </div>

          {/* Feedback Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Your Review
            </label>
            <textarea
              rows={3}
              placeholder="Tell others how your laundry turned out (cleanliness, fragrance, punctuality)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition"
              required
            />
          </div>

          {/* Photo Uploader (Max 3) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Upload Clean Laundry Photos ({photos.length}/3)
              </label>
              <span className="text-[10px] text-slate-400 font-semibold">Max 3 • 5MB Cap</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {photos.map((src, index) => (
                <div key={index} className="relative h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={src} alt="Upload preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {photos.length < 3 && (
                <label className="h-20 rounded-xl border-2 border-dashed border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-sky-600">
                  <Upload className="h-5 w-5 mb-1" />
                  <span className="text-[10px] font-semibold">+ Add Photo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-500 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="hero" size="sm" isLoading={isSubmitting}>
              Submit Review for Approval
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
