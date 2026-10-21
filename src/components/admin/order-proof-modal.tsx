"use client";

import * as React from "react";
import { Camera, UploadCloud, Loader2, X, AlertTriangle, SkipForward } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Order } from "@/types";

interface OrderProofModalProps {
  order: Order | null;
  proofType: "pickup" | "dropoff" | "damage";
  isOpen: boolean;
  onClose: () => void;
  onSaveProof: (
    orderId: string,
    proofType: "pickup" | "dropoff" | "damage",
    imageUrl: string,
    notes?: string
  ) => Promise<void> | void;
  onSkip: (orderId: string, proofType: "pickup" | "dropoff" | "damage") => void;
}

export function OrderProofModal({
  order,
  proofType,
  isOpen,
  onClose,
  onSaveProof,
  onSkip,
}: OrderProofModalProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [damageNotes, setDamageNotes] = React.useState<string>("");
  const [isUploading, setIsUploading] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (order) {
      setDamageNotes(order.damage_notes || "");
      setSelectedFile(null);
      setPreviewUrl(null);
      setErrorMsg(null);
    }
  }, [order, proofType]);

  if (!isOpen || !order) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadAndSave = async () => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      let finalUrl = previewUrl || "";
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("bucket", "order-proofs");
        formData.append("entityId", order.id);
        formData.append("subType", proofType);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url) finalUrl = data.url;
        else if (data.error) throw new Error(data.error);
      }
      if (!finalUrl) { handleSkip(); return; }
      await onSaveProof(order.id, proofType, finalUrl, damageNotes);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkip = () => {
    if (proofType === "dropoff" && order.payment_status === "pending") {
      setErrorMsg("Cannot mark order completed while payment is pending. Please collect payment first.");
      return;
    }
    onSkip(order.id, proofType);
    onClose();
  };

  const titleMap = {
    damage: `Log Garment Flaw — ${order.order_number}`,
    dropoff: `Delivery Proof (Optional) — ${order.order_number}`,
    pickup: `Pickup Proof (Optional) — ${order.order_number}`,
  };
  const descMap = {
    damage: "Document pre-existing wear. Photo is optional but recommended.",
    dropoff: "Upload a photo when handing back or leaving at door. Skip for in-person hand-off.",
    pickup: "Photo proof of pickup doorstep. Skip if handing directly to customer.",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} title={titleMap[proofType]} description={descMap[proofType]}>
      <div className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {proofType === "dropoff" && order.payment_status === "pending" && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Payment is pending. Please collect payment or charge customer card before marking order completed.</span>
          </div>
        )}

        {proofType === "damage" && (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Flaw Description (Optional)</label>
            <input
              type="text"
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="e.g. Broken zipper, small tear near hemline"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
            />
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

        {previewUrl ? (
          <div className="space-y-2">
            <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img src={previewUrl} alt="Selected" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>{selectedFile?.name || "Ready to upload"}</span>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-primary font-bold hover:underline">Change</button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-primary/50 hover:bg-pink-50/20 transition-all text-center space-y-2 cursor-pointer"
          >
            <div className="h-10 w-10 rounded-full bg-pink-100 text-primary flex items-center justify-center mx-auto">
              <Camera className="h-5 w-5" />
            </div>
            <p className="font-bold text-slate-800">Take or select a photo</p>
            <p className="text-[11px] text-slate-400">JPG, PNG, WebP · max 5MB · fully optional</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSkip}
            disabled={isUploading}
            className="w-full sm:w-auto text-slate-500 border-slate-300 hover:bg-slate-50 gap-1.5"
          >
            <SkipForward className="h-3.5 w-3.5" />
            {proofType === "dropoff" ? "Skip & Mark Delivered" : proofType === "pickup" ? "Skip & Mark Picked Up" : "Skip Flaw Log"}
          </Button>

          <Button
            type="button"
            variant="hero"
            size="sm"
            onClick={handleUploadAndSave}
            disabled={isUploading || !selectedFile}
            className="w-full sm:w-auto font-bold gap-2"
          >
            {isUploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /><span>Uploading...</span></>
            ) : (
              <><UploadCloud className="h-4 w-4" /><span>{proofType === "dropoff" ? "Upload & Complete Delivery" : "Upload & Save"}</span></>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
