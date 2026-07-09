"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// ─── Dialog Context ───────────────────────────────────────────────────────────

interface DialogContextValue {
  open: boolean;
  onClose: () => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("Dialog components must be used within <Dialog>");
  return ctx;
}

// ─── Dialog Root ──────────────────────────────────────────────────────────────

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const onClose = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <DialogContext.Provider value={{ open, onClose }}>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
          onClick={onClose}
        />

        {/* Panel */}
        <div className="relative z-10 w-full sm:max-w-lg animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-bottom-0">
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  );
}

// ─── Dialog Content ───────────────────────────────────────────────────────────

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogContent({ className, children }: DialogContentProps) {
  const { onClose } = useDialogContext();

  return (
    <div
      className={cn(
        "relative rounded-t-2xl sm:rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[90dvh] overflow-y-auto",
        "mx-0 sm:mx-4",
        className
      )}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Kapat"
      >
        <X className="size-4" />
      </button>

      {children}
    </div>
  );
}

// ─── Dialog Header ────────────────────────────────────────────────────────────

interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogHeader({ className, children }: DialogHeaderProps) {
  return (
    <div className={cn("mb-4 pr-8", className)}>
      {children}
    </div>
  );
}

// ─── Dialog Title ─────────────────────────────────────────────────────────────

interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogTitle({ className, children }: DialogTitleProps) {
  return (
    <h2
      className={cn("text-lg font-semibold tracking-tight", className)}
    >
      {children}
    </h2>
  );
}

// ─── Dialog Description ───────────────────────────────────────────────────────

interface DialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export function DialogDescription({ className, children }: DialogDescriptionProps) {
  return (
    <p className={cn("text-sm text-muted-foreground mt-1", className)}>
      {children}
    </p>
  );
}
