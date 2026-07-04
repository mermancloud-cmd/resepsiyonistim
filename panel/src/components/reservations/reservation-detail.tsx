"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Phone,
  Mail,
  CalendarDays,
  Home,
  CreditCard,
  Banknote,
  MessageSquare,
  Check,
  X,
  Copy,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reservation, ReservationStatus } from "@/lib/types";
import { PaymentTracker } from "./payment-tracker";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

const statusConfig: Record<
  ReservationStatus,
  { label: string; className: string }
> = {
  bekleyen: {
    label: "Bekleyen",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  },
  onayli: {
    label: "Onaylı",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  iptal: {
    label: "İptal",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
  giris_yapti: {
    label: "Giriş Yaptı",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
}

function formatDateLong(dateStr: string): string {
  return format(parseISO(dateStr), "d MMMM yyyy, EEEE", { locale: tr });
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex items-center justify-center size-8 rounded-lg bg-muted shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

interface ReservationDetailProps {
  reservation: Reservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReservationDetail({
  reservation,
  open,
  onOpenChange,
}: ReservationDetailProps) {
  const [copied, setCopied] = React.useState(false);

  if (!reservation) return null;

  const status = statusConfig[reservation.status];

  const handleCopyIban = () => {
    navigator.clipboard.writeText(reservation.ibanReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] rounded-t-2xl">
        <SheetHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <SheetTitle>Rezervasyon Detayı</SheetTitle>
            <Badge className={cn(status.className)}>{status.label}</Badge>
          </div>
          <SheetDescription>
            {reservation.roomName} • #{reservation.id}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="flex flex-col gap-5 p-4">
            {/* Guest Info */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Misafir Bilgileri
              </h3>
              <div className="rounded-xl bg-muted/50 p-3">
                <InfoRow
                  icon={<User className="size-4 text-muted-foreground" />}
                  label="Ad Soyad"
                  value={reservation.guest.name}
                />
                <InfoRow
                  icon={<Phone className="size-4 text-muted-foreground" />}
                  label="Telefon"
                  value={reservation.guest.phone}
                />
                <InfoRow
                  icon={<Mail className="size-4 text-muted-foreground" />}
                  label="E-posta"
                  value={reservation.guest.email}
                />
              </div>
            </section>

            {/* Dates */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Konaklama Tarihleri
              </h3>
              <div className="rounded-xl bg-muted/50 p-3">
                <InfoRow
                  icon={<CalendarDays className="size-4 text-muted-foreground" />}
                  label="Giriş"
                  value={formatDateLong(reservation.checkIn)}
                />
                <InfoRow
                  icon={<CalendarDays className="size-4 text-muted-foreground" />}
                  label="Çıkış"
                  value={formatDateLong(reservation.checkOut)}
                />
                <InfoRow
                  icon={<Home className="size-4 text-muted-foreground" />}
                  label="Oda"
                  value={reservation.roomName}
                />
              </div>
            </section>

            {/* Pricing Breakdown */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Fiyat Detayı
              </h3>
              <div className="rounded-xl bg-muted/50 p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Gece başı ücret
                  </span>
                  <span className="font-medium">
                    {formatCurrency(reservation.nightlyRate)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Konaklama süresi</span>
                  <span className="font-medium">
                    {reservation.nights} gece
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatCurrency(reservation.nightlyRate)} ×{" "}
                    {reservation.nights} gece
                  </span>
                  <span className="font-medium">
                    {formatCurrency(
                      reservation.nightlyRate * reservation.nights
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Toplam Tutar</span>
                  <span className="text-primary">
                    {formatCurrency(reservation.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Beklenen Depozito (%30)
                  </span>
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    {formatCurrency(reservation.depositAmount)}
                  </span>
                </div>
              </div>
            </section>

            {/* IBAN Payment Tracking */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                IBAN Ödeme Takibi
              </h3>
              <div className="rounded-xl bg-muted/50 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Banknote className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">IBAN Referansı</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-foreground">
                      {reservation.ibanReference.slice(0, 10)}...
                    </span>
                    <button
                      onClick={handleCopyIban}
                      className="p-1 rounded hover:bg-muted transition-colors"
                    >
                      {copied ? (
                        <CheckCheck className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="size-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                <PaymentTracker
                  expectedAmount={reservation.depositAmount}
                  guestName={reservation.guest.name}
                  ibanReference={reservation.ibanReference}
                  status={
                    reservation.paymentStatus === "odeme_alindi"
                      ? "onaylandi"
                      : reservation.paymentStatus === "depozito_odendi"
                        ? "onaylandi"
                        : "bekleyen"
                  }
                />

                {reservation.paymentNotes && (
                  <div className="rounded-lg bg-background p-2.5">
                    <p className="text-xs text-muted-foreground mb-1">
                      Ödeme Notları
                    </p>
                    <p className="text-sm">{reservation.paymentNotes}</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>

        <SheetFooter className="border-t pt-3 gap-2">
          {reservation.status === "bekleyen" && (
            <>
              <Button
                variant="default"
                size="lg"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="size-4" />
                Onayla
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="flex-1"
              >
                <X className="size-4" />
                Reddet
              </Button>
            </>
          )}
          <Button variant="outline" size="lg" className="w-full">
            <MessageSquare className="size-4" />
            Misafire Mesaj
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
