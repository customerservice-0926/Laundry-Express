"use client";

import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
              variant === "danger" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
            }`}
          >
            {variant === "danger" ? <Trash2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">{title}</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="hero"
            size="sm"
            disabled={isLoading}
            onClick={onConfirm}
            className={
              variant === "danger"
                ? "bg-rose-600 hover:bg-rose-700 text-white font-bold"
                : "bg-amber-600 hover:bg-amber-700 text-white font-bold"
            }
          >
            {isLoading ? "Deleting..." : confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
