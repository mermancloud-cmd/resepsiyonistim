"use client";

import * as React from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  Hash,
  Calendar,
  Banknote,
  Home,
  FileText,
  MessageSquare,
  ArrowLeft,
  ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IBANPayment } from "@/lib/mock-data";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const statusConfig = {
  pending: {
    label: "Bekliyor",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
  },
  approved: {
    label: "Onaylandı",
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Reddedildi",
    color:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
} as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface PaymentActionModalProps {
  payment: IBANPayment;
  onApprove: (id: string, notes?: string) => void;
  onReject: (id: string, notes?: string) => void;
  onClose: () => void;
}

export function PaymentActionModal({
  payment,
  onApprove,
  onReject,
  onClose,
}: PaymentActionModalProps) {
  const [notes, setNotes] = React.useState("");
  const [pendingAction, setPendingAction] = React.useState<
    "approve" | "reject" | null
  >(null);

  // Reset state when payment changes
  React.useEffect(() => {
    setNotes("");
    setPendingAction(null);
  }, [payment.id]);

  const status = statusConfig[payment.status];
  const StatusIcon = status.icon;
  const isPending = payment.status === "pending";

  const handleConfirm = () => {
    if (pendingAction === "approve") {
      onApprove(payment.id, notes.trim() || undefined);
    } else if (pendingAction === "reject") {
      onReject(payment.id, notes.trim() || undefined);
    }
    setPendingAction(null);
    setNotes("");
  };

  const handleCancelAction = () => {
    setPendingAction(null);
    setNotes("");
  };

  return (
    <Card>
      <CardHeader>
        {/* Top bar: back button + title */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <ArrowLeft className="size-4" />
          </Button>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="size-5 text-primary" />
            Ödeme Detayı
          </CardTitle>
        </div>

        {/* Status badge + reference code */}
        <div className="flex items-center gap-2 mt-1">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              status.color
            )}
          >
            <StatusIcon className="size-3" />
            {status.label}
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">
            {payment.reference_code}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Amount highlight ──────────────────────────────────────── */}
        <div className="rounded-lg bg-primary/5 border border-primary/10 p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            ₺{payment.amount.toLocaleString("tr-TR")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            IBAN son 4: {payment.iban_last4} · {payment.currency}
          </p>
        </div>

        <Separator />

        {/* ── Guest information ─────────────────────────────────────── */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Misafir Bilgileri
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <User className="size-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Ad Soyad</p>
                <p className="text-sm font-medium truncate">
                  {payment.guest_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="size-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Telefon</p>
                <p className="text-sm font-medium">{payment.guest_phone}</p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Reservation information ───────────────────────────────── */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Rezervasyon Bilgileri
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5">
              <Home className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Oda / Birim</p>
                <p className="text-sm font-medium truncate">
                  {payment.room_name}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Hash className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Referans Kodu</p>
                <p className="text-sm font-medium font-mono text-[11px]">
                  {payment.reference_code}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Calendar className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Giriş Tarihi</p>
                <p className="text-sm font-medium">
                  {formatDate(payment.check_in_date)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <FileText className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Gönderim Tarihi</p>
                <p className="text-sm font-medium">
                  {formatDate(payment.submitted_at)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatTime(payment.submitted_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Existing notes ────────────────────────────────────────── */}
        {payment.notes && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-muted-foreground" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Mevcut Notlar
                </p>
              </div>
              <p className="text-sm bg-muted/50 rounded-lg p-2.5 leading-relaxed">
                {payment.notes}
              </p>
            </div>
          </>
        )}

        {/* ── Review metadata ───────────────────────────────────────── */}
        {payment.reviewed_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            <span>
              İncelendi: {formatDate(payment.reviewed_at)}{" "}
              {formatTime(payment.reviewed_at)}
              {payment.reviewed_by && ` · ${payment.reviewed_by}`}
            </span>
          </div>
        )}

        {/* ── Action area (pending payments only) ───────────────────── */}
        {isPending && (
          <>
            <Separator />

            <div className="space-y-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Ödeme İşlemi
              </p>

              {/* Notes textarea */}
              <div className="space-y-1.5">
                <Label htmlFor="action-notes" className="text-xs">
                  <MessageSquare className="size-3.5" />
                  İnceleme Notu{" "}
                  <span className="text-muted-foreground font-normal">
                    (isteğe bağlı)
                  </span>
                </Label>
                <textarea
                  id="action-notes"
                  className={cn(
                    "w-full rounded-lg border border-input bg-transparent px-2.5 py-2",
                    "text-sm outline-none placeholder:text-muted-foreground",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    "min-h-[64px] resize-none"
                  )}
                  placeholder="Onay veya red nedeni, not ekleyin..."
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNotes(e.target.value)
                  }
                  rows={2}
                />
              </div>

              {/* Confirmation step */}
              {pendingAction ? (
                <div className="space-y-2.5">
                  <div
                    className={cn(
                      "rounded-lg p-2.5 text-xs text-center",
                      pendingAction === "approve"
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                    )}
                  >
                    {pendingAction === "approve"
                      ? "Bu ödemeyi onaylamak istediğinize emin misiniz?"
                      : "Bu ödemeyi reddetmek istediğinize emin misiniz?"}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className={cn(
                        "flex-1",
                        pendingAction === "approve"
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : ""
                      )}
                      variant={
                        pendingAction === "approve" ? "default" : "destructive"
                      }
                      onClick={handleConfirm}
                    >
                      {pendingAction === "approve" ? (
                        <>
                          <CheckCircle2 className="size-3.5" />
                          Evet, Onayla
                        </>
                      ) : (
                        <>
                          <XCircle className="size-3.5" />
                          Evet, Reddet
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelAction}>
                      Vazgeç
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setPendingAction("approve")}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Onayla
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setPendingAction("reject")}
                  >
                    <XCircle className="size-3.5" />
                    Reddet
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
