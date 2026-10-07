"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DialogSize = "sm" | "md" | "lg" | "xl";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: DialogSize;
  children: React.ReactNode;
  className?: string;
}

/**
 * Dialog Component
 *
 * Accessible modal dialog primitive enforcing:
 * - Complete background body & html scroll block while dialog is open
 * - Portal to document.body preventing CSS transform / overflow containment issues
 * - Single unified scroll container (strictly prevents dual nested scrollbars)
 * - Backdrop click-to-close & escape key dismissal
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  children,
  className,
}: DialogProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Comprehensive body & HTML scroll lock
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    // Store original document styles
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyTouch = document.body.style.touchAction;

    // Hard block background scrolling
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.touchAction = originalBodyTouch;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open || !mounted) return null;

  const sizeClasses: Record<DialogSize, string> = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden overscroll-none"
    >
      {/* Backdrop with event isolation */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => onOpenChange(false)}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        aria-hidden="true"
      />

      {/* Modal Dialog Card: Single clean container with fixed header and single scrollable content */}
      <div
        className={cn(
          "relative w-full bg-white rounded-3xl shadow-2xl border border-slate-100 z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden",
          sizeClasses[size],
          className
        )}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 shrink-0 bg-white">
          <div className="min-w-0 pr-4">
            {title && (
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Single Dedicated Scrollable Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain min-h-0">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * DialogFooter Component
 *
 * Consistent button row helper for modal dialogs.
 */
export function DialogFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6 shrink-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export default Dialog;
