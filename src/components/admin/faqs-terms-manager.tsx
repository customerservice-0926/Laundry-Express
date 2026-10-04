"use client";

import * as React from "react";
import { HelpCircle, FileText, Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FaqOrTermItem {
  id: string;
  category: "faq" | "terms";
  title: string;
  subtitle?: string;
  description: string;
}

interface ContentResponse {
  success: boolean;
  error?: string;
  faqs?: { id: string; question: string; answer: string }[];
  terms?: { id: string; title: string; subtitle?: string; description: string }[];
}

export function FaqsTermsManager() {
  const [items, setItems] = React.useState<FaqOrTermItem[]>([]);
  const [activeTab, setActiveTab] = React.useState<"faq" | "terms">("faq");
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    fetch("/api/content", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json() as ContentResponse;
        if (!res.ok || !data.success) throw new Error(data.error || "Unable to load content.");
        return data;
      })
      .then((data) => {
        const fetchedFaqs: FaqOrTermItem[] = (data.faqs || []).map((f) => ({
          id: f.id,
          category: "faq",
          title: f.question,
          description: f.answer,
        }));
        const fetchedTerms: FaqOrTermItem[] = (data.terms || []).map((t) => ({
          id: t.id,
          category: "terms",
          title: t.title,
          subtitle: t.subtitle,
          description: t.description,
        }));
        setItems([...fetchedFaqs, ...fetchedTerms]);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load content."));
  }, []);

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setDescription("");
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !description.trim()) {
      setError("A title and description are required.");
      return;
    }

    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: activeTab === "faq" ? "faqs" : "terms",
          item: {
            id: editingId || undefined,
            question: title.trim(),
            title: title.trim(),
            subtitle: activeTab === "terms" ? subtitle.trim() : undefined,
            answer: description.trim(),
            description: description.trim(),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to save content.");
      const saved = activeTab === "faq" ? data.faq : data.term;
      const persistedItem: FaqOrTermItem = activeTab === "faq"
        ? { id: saved.id, category: "faq", title: saved.question, description: saved.answer }
        : { id: saved.id, category: "terms", title: saved.title, subtitle: saved.subtitle, description: saved.description };
      setItems((prev) => editingId
        ? prev.map((item) => item.id === editingId ? persistedItem : item)
        : [persistedItem, ...prev]);
      resetForm();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unable to save content.");
    }
  };

  const handleStartEdit = (item: FaqOrTermItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setSubtitle(item.subtitle || "");
    setDescription(item.description);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      const response = await fetch(`/api/content?section=${activeTab === "faq" ? "faqs" : "terms"}&id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to delete content.");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unable to delete content.");
    }
  };

  const filteredItems = items.filter((item) => item.category === activeTab);

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-black text-slate-900">FAQs and Terms &amp; Guarantees Manager</h3>
          <p className="text-xs text-slate-500">Live content management for customer questions and policy guarantees in database.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1 rounded-xl bg-slate-100 flex gap-1">
            <button
              type="button"
              onClick={() => { setActiveTab("faq"); resetForm(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "faq" ? "bg-white text-primary shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5 inline mr-1" />
              FAQs
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("terms"); resetForm(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "terms" ? "bg-white text-primary shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="h-3.5 w-3.5 inline mr-1" />
              Terms
            </button>
          </div>

          {!isAdding && (
            <Button size="sm" variant="hero" onClick={() => setIsAdding(true)} className="cursor-pointer text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              <span>Add {activeTab === "faq" ? "FAQ" : "Term"}</span>
            </Button>
          )}
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
          <span className="font-bold text-slate-900 block">
            {editingId ? "Edit Item" : `New ${activeTab === "faq" ? "FAQ" : "Guarantee / Term"}`}
          </span>
          <input
            type="text"
            required
            placeholder={activeTab === "faq" ? "Question (e.g. What if I am away?)" : "Guarantee Title"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
          />
          {activeTab === "terms" && (
            <input
              type="text"
              placeholder="Subtitle (e.g. Prompt doorstep return)"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            />
          )}
          <textarea
            required
            rows={3}
            placeholder="Description (Markdown supported: **bold**, *italic*)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-[11px]"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetForm} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" variant="hero" size="sm" className="cursor-pointer">
              Save to Database
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            No {activeTab === "faq" ? "FAQs" : "terms"} added yet. Click &quot;Add {activeTab === "faq" ? "FAQ" : "Term"}&quot; to create one.
          </p>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="p-4 rounded-2xl border border-slate-200 bg-white flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="font-bold text-slate-900 text-xs block">{item.title}</span>
                {item.subtitle && <span className="text-[11px] font-semibold text-primary block">{item.subtitle}</span>}
                <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => handleStartEdit(item)} className="h-7 w-7 p-0 cursor-pointer">
                  <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="h-7 w-7 p-0 cursor-pointer text-rose-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
