"use client";

import * as React from "react";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
  isLoading?: boolean;
}

export function ConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  const isDanger = variant === "danger";

  // Gracefully highlight order identifiers in title (e.g. #LX-2026-...)
  const renderFormattedTitle = () => {
    const match = title.match(/^(.*?)((?:#LX-|#)[A-Za-z0-9-]+)(\??)$/);
    if (match) {
      return (
        <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
          <span>{match[1].trim()} </span>
          <span className="inline-block font-mono text-xs font-extrabold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200/80 select-all align-middle">
            {match[2]}
          </span>
          {match[3] && <span>{match[3]}</span>}
        </h4>
      );
    }
    return (
      <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
        {title}
      </h4>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="sm">
      <div className="py-2 px-1 text-center">
        {/* Status Icon Badge */}
        <div
          className={cn(
            "h-13 w-13 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-2xs border transition-all",
            isDanger
              ? "bg-rose-50 border-rose-200/80 text-rose-600 ring-4 ring-rose-50/60"
              : "bg-amber-50 border-amber-200/80 text-amber-600 ring-4 ring-amber-50/60"
          )}
        >
          {isDanger ? (
            <Trash2 className="h-6 w-6 stroke-[1.8]" />
          ) : (
            <AlertTriangle className="h-6 w-6 stroke-[1.8]" />
          )}
        </div>

        {/* Title & Copy */}
        <div className="space-y-1.5">
          {renderFormattedTitle()}
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        </div>

        {/* Warning Indicator */}
        <div
          className={cn(
            "mt-3.5 py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-[11px] font-semibold",
            isDanger
              ? "bg-rose-50/60 border-rose-100 text-rose-700"
              : "bg-amber-50/60 border-amber-100 text-amber-700"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>This action is permanent and cannot be undone.</span>
        </div>

        {/* Action Button Controls */}
        <div className="grid grid-cols-2 gap-2.5 pt-4 mt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
            className="h-10 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 rounded-xl shadow-2xs"
          >
            {cancelText}
          </Button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={cn(
              "h-10 px-4 rounded-xl text-white font-extrabold text-xs shadow-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none",
              isDanger
                ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
                : "bg-amber-600 hover:bg-amber-700 active:bg-amber-800"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                {isDanger ? (
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                )}
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
