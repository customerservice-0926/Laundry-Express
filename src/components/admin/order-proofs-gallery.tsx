"use client";

import * as React from "react";
import Image from "next/image";
import { Camera, Trash2, RefreshCw, Plus, Loader2, Edit2, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { Order, OrderProof } from "@/types";

interface OrderProofsGalleryProps {
  order: Order;
  onOrderUpdated?: (updated: Order) => void;
}

export function OrderProofsGallery({ order, onOrderUpdated }: OrderProofsGalleryProps) {
  const [proofs, setProofs] = React.useState<OrderProof[]>(order.proofs || []);
  const [isUploading, setIsUploading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [proofToDelete, setProofToDelete] = React.useState<OrderProof | null>(null);
  const [editingProofId, setEditingProofId] = React.useState<string | null>(null);
  const [editNoteText, setEditNoteText] = React.useState("");
  const [selectedProofType, setSelectedProofType] = React.useState<"pickup" | "dropoff" | "damage">("dropoff");
  const [replacingProofId, setReplacingProofId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setProofs(order.proofs || []);
  }, [order.proofs]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("proofType", selectedProofType);
      if (replacingProofId) formData.append("replaceProofId", replacingProofId);

      const res = await fetch(`/api/orders/${order.id}/proofs`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to upload photo.");

      toast.success(replacingProofId ? "Photo replaced successfully." : "Photo uploaded successfully.");
      if (data.order) {
        setProofs(data.order.proofs || []);
        onOrderUpdated?.(data.order);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to upload image.");
    } finally {
      setIsUploading(false);
      setReplacingProofId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteProof = async () => {
    if (!proofToDelete) return;
    setDeletingId(proofToDelete.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/proofs?proofId=${proofToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete photo.");
      const updatedList = proofs.filter((p) => p.id !== proofToDelete.id);
      setProofs(updatedList);
      toast.success("Photo deleted from storage & order.");
      setProofToDelete(null);
      if (data.order) onOrderUpdated?.(data.order);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete photo.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveNote = async (proofId: string) => {
    try {
      const res = await fetch(`/api/orders/${order.id}/proofs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofId, notes: editNoteText.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update note.");
      toast.success("Photo caption saved.");
      if (data.order) {
        setProofs(data.order.proofs || []);
        onOrderUpdated?.(data.order);
      }
      setEditingProofId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save note.");
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-sky-600" />
          <span className="font-bold text-xs text-slate-900">Photo Proof Gallery &amp; Pre-wash Damage Audit</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedProofType}
            onChange={(e) => setSelectedProofType(e.target.value as "pickup" | "dropoff" | "damage")}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
          >
            <option value="dropoff">Delivery Proof</option>
            <option value="pickup">Pickup Proof</option>
            <option value="damage">Pre-wash Damage</option>
          </select>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => { setReplacingProofId(null); fileInputRef.current?.click(); }}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            <span>Add Photo</span>
          </button>
        </div>
      </div>

      {proofs.length === 0 ? (
        <div className="py-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs">
          <Camera className="h-6 w-6 mx-auto mb-1 text-slate-300" />
          <span>No photo proofs recorded yet. Upload pickup, drop-off, or damage photos.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {proofs.map((proof) => (
            <div key={proof.id} className="group relative rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs flex flex-col justify-between pb-2">
              <div>
                <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
                  <Image src={proof.photo_url || proof.image_url || ""} alt={proof.notes || "Order proof"} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      title="Replace photo"
                      onClick={() => { setReplacingProofId(proof.id); fileInputRef.current?.click(); }}
                      className="p-1 rounded-md bg-white text-slate-800 hover:text-primary transition shadow-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete photo"
                      disabled={deletingId === proof.id}
                      onClick={() => setProofToDelete(proof)}
                      className="p-1 rounded-md bg-white text-rose-600 hover:bg-rose-50 transition shadow-xs"
                    >
                      {deletingId === proof.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="px-2 pt-1">
                  <span className="font-extrabold uppercase text-[9px] block text-sky-700">
                    {proof.proof_type === "damage" ? "Pre-wash Damage" : `${proof.proof_type} Proof`}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">{formatDate(proof.created_at)}</span>
                  {editingProofId === proof.id ? (
                    <div className="flex items-center gap-1 pt-1">
                      <input
                        type="text"
                        value={editNoteText}
                        onChange={(e) => setEditNoteText(e.target.value)}
                        placeholder="Add caption..."
                        className="w-full text-[10px] px-1 py-0.5 rounded border border-slate-300"
                      />
                      <button type="button" onClick={() => handleSaveNote(proof.id)} className="p-0.5 text-emerald-600 hover:text-emerald-700"><Check className="h-3 w-3" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[10px] text-slate-600 pt-0.5">
                      <span className="truncate italic">{proof.notes || "No caption"}</span>
                      <button
                        type="button"
                        onClick={() => { setEditingProofId(proof.id); setEditNoteText(proof.notes || ""); }}
                        className="text-slate-400 hover:text-primary ml-1"
                      >
                        <Edit2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Confirmation Modal for Photo Deletion (No window.confirm) */}
      <ConfirmModal
        open={Boolean(proofToDelete)}
        onOpenChange={(open) => !open && setProofToDelete(null)}
        onConfirm={handleDeleteProof}
        title="Delete Photo Proof?"
        description="This will permanently delete this image from cloud storage and remove it from the order record."
        confirmText="Delete Photo"
        isLoading={Boolean(deletingId)}
      />
    </div>
  );
}
