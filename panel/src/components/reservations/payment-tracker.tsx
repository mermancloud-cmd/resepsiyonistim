"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Banknote,
  Check,
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentTrackingStatus } from "@/lib/types";

const statusConfig: Record<
  PaymentTrackingStatus,
  { label: string; icon: React.ReactNode; className: string; badgeClass: string }
> = {
  bekleyen: {
    label: "Ödeme Bekleniyor",
    icon: <Clock className="size-4" />,
    className: "text-amber-700 dark:text-amber-400",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  },
  onaylandi: {
    label: "Ödeme Onaylandı",
    icon: <CheckCircle2 className="size-4" />,
    className: "text-emerald-700 dark:text-emerald-400",
    badgeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  reddedildi: {
    label: "Ödeme Reddedildi",
    icon: <XCircle className="size-4" />,
    className: "text-red-700 dark:text-red-400",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
}

interface PaymentTrackerProps {
  expectedAmount: number;
  guestName: string;
  ibanReference: string;
  status: PaymentTrackingStatus;
  onConfirm?: () => void;
  onReject?: () => void;
}

export function PaymentTracker({
  expectedAmount,
  guestName,
  ibanReference,
  status,
  onConfirm,
  onReject,
}: PaymentTrackerProps) {
  const config = statusConfig[status];

  return (
    <div className="rounded-xl border border-border/60 bg-background p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center gap-1.5", config.className)}>
            {config.icon}
            <span className="text-sm font-medium">{config.label}</span>
          </div>
        </div>
        <Badge className={config.badgeClass}>
          {config.label}
        </Badge>
      </div>

      {/* Payment Details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Beklenen Tutar</p>
          <p className="font-semibold text-foreground">
            {formatCurrency(expectedAmount)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            (Toplamın %30&apos;u depozito)
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Misafir</p>
          <p className="font-medium text-foreground truncate">{guestName}</p>
        </div>
      </div>

      {/* IBAN Reference */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
        <Banknote className="size-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">IBAN Referansı</p>
          <p className="text-xs font-mono font-medium truncate">
            {ibanReference}
          </p>
        </div>
      </div>

      {/* Action Buttons - Only show when pending */}
      {status === "bekleyen" && (
        <div className="flex gap-2 pt-1">
          <Button
            variant="default"
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onConfirm}
          >
            <Check className="size-3.5" />
            Ödemeyi Onayla
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={onReject}
          >
            <X className="size-3.5" />
            Reddet
          </Button>
        </div>
      )}

      {/* Info for non-pending states */}
      {status !== "bekleyen" && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/30 p-2.5">
          <AlertCircle className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            {status === "onaylandi"
              ? "Bu ödeme manuel olarak onaylanmıştır. Banka kayıtları ile karşılaştırmanız önerilir."
              : "Bu ödeme reddedilmiştir. Misafir ile iletişime geçiniz."}
          </p>
        </div>
      )}
    </div>
  );
}
