"use client";

import * as React from "react";
import { Shirt, Plus, Trash2, CheckCircle2, XCircle, Edit3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { toast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import type { AdditionalItem } from "@/types";

export function AdditionalItemsManager() {
  const [items, setItems] = React.useState<AdditionalItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [category, setCategory] = React.useState("specialty");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<AdditionalItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/additional-items?all=true", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Unable to load items.");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load items.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { void fetchItems(); }, [fetchItems]);

  const handleStartEdit = (item: AdditionalItem) => {
    setEditingId(item.id);
    setName(item.name);
    setPrice(String(item.price));
    setCategory(item.category || "specialty");
    setDescription(item.description || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName("");
    setPrice("");
    setCategory("specialty");
    setDescription("");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setIsSubmitting(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const payload: Record<string, unknown> = {
        name: name.trim(),
        price: parseFloat(price),
        category: category.trim() || "specialty",
        description: description.trim(),
        is_active: true,
      };
      if (editingId) payload.id = editingId;

      const res = await fetch("/api/additional-items", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save item.");

      if (editingId) {
        setItems((prev) => prev.map((i) => (i.id === editingId ? data.item : i)));
        toast.success(`Updated ${data.item.name}.`);
        handleCancelEdit();
      } else {
        setItems((prev) => [...prev, data.item]);
        toast.success(`Added ${data.item.name} ($${data.item.price}).`);
        setName(""); setPrice(""); setDescription("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (item: AdditionalItem) => {
    try {
      const res = await fetch("/api/additional-items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_active: !item.is_active }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update item.");
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: !i.is_active } : i)));
      toast.success(`${item.name} is now ${!item.is_active ? "active" : "hidden"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update status.");
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/additional-items?id=${itemToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete item.");
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      if (editingId === itemToDelete.id) handleCancelEdit();
      toast.success(`${itemToDelete.name} deleted.`);
      setItemToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete item.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Shirt className="h-5 w-5 text-primary" /> Specialty &amp; Additional Items Manager
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Configure specialty items (comforters, blankets, uniforms, shoes) with custom prices.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              {editingId ? <Edit3 className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
              {editingId ? "Edit Specialty Item" : "Add Specialty Item"}
            </h3>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-0.5">
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            )}
          </div>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Item Title *</label>
              <input
                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. King size comforter, Queen size comforter"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Price ($) *</label>
                <input
                  type="number" step="0.01" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25.00"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary bg-white">
                  <option value="bedding">Bedding / Comforter</option>
                  <option value="specialty">Specialty</option>
                  <option value="uniforms">Uniforms</option>
                  <option value="footwear">Footwear</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Description / Notes</label>
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Fluff dry, sanitized wash" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="hero" disabled={isSubmitting} className="flex-1 text-xs font-bold">
                {isSubmitting ? "Saving..." : editingId ? "Update Item" : "Add to Order Options"}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={handleCancelEdit} className="text-xs">Cancel</Button>}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">Configured Items ({items.length})</span>
              <span className="text-[11px] text-slate-400">Live on Booking &amp; Invoices</span>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading items...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No specialty items configured yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900 truncate">{item.name}</span>
                        <Badge variant="outline" className="text-[10px] capitalize font-bold text-slate-500 border-slate-200">{item.category || "specialty"}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-md">{item.description || "No description provided."}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-extrabold text-sm text-slate-900 mr-2">{formatCurrency(item.price)}</span>
                      <button
                        type="button" onClick={() => handleToggle(item)}
                        className={`px-2 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 cursor-pointer transition-colors ${
                          item.is_active ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {item.is_active ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-slate-400" />}
                        {item.is_active ? "Active" : "Hidden"}
                      </button>
                      <button type="button" onClick={() => handleStartEdit(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary transition-colors cursor-pointer" title="Edit item"><Edit3 className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setItemToDelete(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer" title="Delete item"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        onConfirm={handleDelete}
        title={`Delete ${itemToDelete?.name}?`}
        description="This will remove this specialty item from all order forms and price lists."
        confirmText="Delete Item"
        isLoading={isDeleting}
      />
    </div>
  );
}
