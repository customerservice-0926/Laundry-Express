"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.toasts]));
  }

  show(message: string, type: ToastType = "info", title?: string, duration = 4000) {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = { id, type, title, message };
    this.toasts = [item, ...this.toasts.slice(0, 4)];
    this.notify();

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }
}

export const toastManager = new ToastManager();

export const toast = {
  success: (message: string, title?: string) => toastManager.show(message, "success", title),
  error: (message: string, title?: string) => toastManager.show(message, "error", title),
  info: (message: string, title?: string) => toastManager.show(message, "info", title),
  dismiss: (id: string) => toastManager.dismiss(id),
};

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    return toastManager.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto rounded-2xl p-4 shadow-xl border flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${
            t.type === "success"
              ? "bg-slate-900 text-white border-emerald-500/40"
              : t.type === "error"
              ? "bg-rose-950 text-white border-rose-500/50"
              : "bg-slate-900 text-white border-sky-500/40"
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {t.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
            {t.type === "error" && <AlertCircle className="h-5 w-5 text-rose-400" />}
            {t.type === "info" && <Info className="h-5 w-5 text-sky-400" />}
          </div>
          <div className="flex-1 min-w-0">
            {t.title && <div className="font-bold text-xs leading-none mb-1">{t.title}</div>}
            <div className="text-xs font-medium text-slate-200 leading-relaxed">{t.message}</div>
          </div>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="shrink-0 text-slate-400 hover:text-white p-0.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
