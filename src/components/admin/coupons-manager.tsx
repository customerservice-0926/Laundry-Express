"use client";

import * as React from "react";
import { Tag, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CouponItem } from "@/lib/services/coupon-service";

export function CouponsManager() {
  const [coupons, setCoupons] = React.useState<CouponItem[]>([]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");
  const [discountType, setDiscountType] = React.useState<"percentage" | "fixed_amount" | "free_delivery">("percentage");
  const [discountValue, setDiscountValue] = React.useState<number>(15);
  const [minOrder, setMinOrder] = React.useState<number>(0);
  const [expiresAt, setExpiresAt] = React.useState("");
  const [maxUses, setMaxUses] = React.useState<string>("");
  const [editItem, setEditItem] = React.useState<Partial<CouponItem>>({});

  const loadCoupons = React.useCallback(() => {
    fetch("/api/coupons").then((r) => r.json()).then((d) => {
      if (Array.isArray(d.coupons)) setCoupons(d.coupons);
    }).catch(() => {});
  }, []);

  React.useEffect(() => { loadCoupons(); }, [loadCoupons]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    const payload: Partial<CouponItem> = {
      title: title.trim() || `${code.trim().toUpperCase()} Promo`, code: code.trim().toUpperCase(),
      discount_type: discountType, discount_value: Number(discountValue), min_order_amount: Number(minOrder || 0),
      expires_at: expiresAt || undefined, max_uses: maxUses ? Number(maxUses) : undefined, is_active: true,
    };
    try {
      const res = await fetch("/api/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.coupon) {
        setCoupons((prev) => [data.coupon, ...prev]);
        setTitle(""); setCode(""); setExpiresAt(""); setMaxUses("");
      }
    } catch {}
  };

  const handleToggleActive = async (coupon: CouponItem) => {
    const updated = { ...coupon, is_active: !coupon.is_active };
    setCoupons((p) => p.map((c) => (c.id === coupon.id ? updated : c)));
    try { await fetch("/api/coupons", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) }); } catch {}
  };

  const handleDelete = async (id: string) => {
    setCoupons((p) => p.filter((c) => c.id !== id));
    try { await fetch(`/api/coupons?id=${encodeURIComponent(id)}`, { method: "DELETE" }); } catch {}
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch("/api/coupons", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...editItem }) });
      const data = await res.json();
      if (data.coupon) {
        setCoupons((p) => p.map((c) => (c.id === editingId ? data.coupon : c)));
        setEditingId(null);
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreateCoupon} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Create New Promo Coupon</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Coupon Code *</label>
            <input type="text" required placeholder="e.g. WELCOME20" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="w-full px-3 py-2 rounded-xl border border-slate-200 uppercase font-mono font-bold" />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Promotion Title</label>
            <input type="text" placeholder="e.g. 20% First Wash" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Discount Type</label>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value as CouponItem["discount_type"])} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed_amount">Fixed Amount ($)</option>
              <option value="free_delivery">Free Delivery (100%)</option>
            </select>
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Value ({discountType === "percentage" ? "%" : "$"})</label>
            <input type="number" step="0.5" disabled={discountType === "free_delivery"} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Min Spend ($)</label>
            <input type="number" step="1" value={minOrder} onChange={(e) => setMinOrder(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Max Usages</label>
            <input type="number" placeholder="Unlimited" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
          <div className="sm:col-span-2">
            <label className="font-bold text-slate-700 block mb-1">Expiration Date</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="hero" size="sm" className="cursor-pointer text-xs"><Plus className="h-3.5 w-3.5 mr-1" /><span>Issue Coupon</span></Button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((c) => (
          <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between gap-4 shadow-2xs">
            {editingId === c.id ? (
              <div className="space-y-2 text-xs">
                <input type="text" value={editItem.title || ""} onChange={(e) => setEditItem((p) => ({ ...p, title: e.target.value }))} className="w-full px-2.5 py-1.5 rounded-lg border font-bold" />
                <input type="number" value={editItem.discount_value ?? 0} onChange={(e) => setEditItem((p) => ({ ...p, discount_value: Number(e.target.value) }))} className="w-full px-2.5 py-1.5 rounded-lg border" />
                <div className="flex gap-2 justify-end pt-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-xs"><X className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="hero" onClick={handleSaveEdit} className="h-7 text-xs"><Check className="h-3.5 w-3.5 mr-1" />Save</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-slate-900 text-sm tracking-wider">{c.code}</span>
                  <Badge variant={c.is_active ? "success" : "secondary"} className="text-[10px]">{c.is_active ? "Active" : "Disabled"}</Badge>
                </div>
                <p className="text-xs font-bold text-slate-800">{c.title}</p>
                <div className="text-xs text-slate-500 space-y-0.5">
                  <p>Discount: <strong className="text-slate-900 font-black">{c.discount_type === "percentage" ? `${c.discount_value}% OFF` : c.discount_type === "fixed_amount" ? `$${c.discount_value} OFF` : "FREE DELIVERY"}</strong></p>
                  <p>Min Order: ${c.min_order_amount ?? 0} • Uses: {c.used_count || 0}{c.max_uses ? ` / ${c.max_uses}` : " (unlimited)"}</p>
                  {c.expires_at && <p className="text-[11px] text-amber-600">Expires: {new Date(c.expires_at).toLocaleDateString()}</p>}
                </div>
              </div>
            )}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={c.is_active} onChange={() => handleToggleActive(c)} className="rounded text-primary h-4 w-4" />
                <span className="font-bold text-slate-700 text-[11px]">{c.is_active ? "Active" : "Inactive"}</span>
              </label>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEditingId(c.id); setEditItem(c); }} className="h-7 w-7 p-0 cursor-pointer text-slate-500 hover:text-slate-800"><Edit2 className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)} className="h-7 w-7 p-0 cursor-pointer text-rose-600 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
