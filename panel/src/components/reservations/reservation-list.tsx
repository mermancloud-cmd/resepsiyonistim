"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarDays,
  ChevronRight,
  Trash2,
  Eye,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reservation, ReservationStatus } from "@/lib/types";
import { mockReservations } from "@/lib/mock-data";
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

const paymentLabels: Record<string, string> = {
  odeme_bekleniyor: "IBAN Ödeme Bekleniyor",
  odeme_alindi: "Ödeme Alındı",
  depozito_odendi: "Depozito Ödendi",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "d MMM", { locale: tr });
}

interface ReservationCardProps {
  reservation: Reservation;
  onTap: (reservation: Reservation) => void;
}

function ReservationCard({ reservation, onTap }: ReservationCardProps) {
  const [swiped, setSwiped] = React.useState(false);
  const touchStartX = React.useRef(0);
  const status = statusConfig[reservation.status];

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe actions background */}
      <div className="absolute inset-0 flex items-center justify-end gap-2 pr-3 bg-red-50 dark:bg-red-950/20">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white"
          onClick={(e) => {
            e.stopPropagation();
            setSwiped(false);
          }}
        >
          <Trash2 className="size-4" />
        </button>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white"
          onClick={(e) => {
            e.stopPropagation();
            setSwiped(false);
            onTap(reservation);
          }}
        >
          <Eye className="size-4" />
        </button>
      </div>

      {/* Main card */}
      <div
        className={cn(
          "relative transition-transform duration-200 ease-out",
          swiped && "-translate-x-24"
        )}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (diff > 60) setSwiped(true);
          else if (diff < -30) setSwiped(false);
        }}
        onClick={() => onTap(reservation)}
      >
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">
                    {reservation.guest.name}
                  </h3>
                  <Badge className={cn("shrink-0", status.className)}>
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {reservation.roomName}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                  <CalendarDays className="size-3.5 shrink-0" />
                  <span>
                    {formatDate(reservation.checkIn)} →{" "}
                    {formatDate(reservation.checkOut)}
                  </span>
                  <span className="text-xs text-muted-foreground/70">
                    ({reservation.nights} gece)
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-sm font-semibold text-foreground">
                  {formatCurrency(reservation.totalAmount)}
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CreditCard className="size-3" />
                  <span>{paymentLabels[reservation.paymentStatus]}</span>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground/50 mt-1 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ReservationListProps {
  onSelectReservation?: (reservation: Reservation) => void;
}

export function ReservationList({ onSelectReservation }: ReservationListProps) {
  const [filter, setFilter] = React.useState<string>("all");

  const filteredReservations = React.useMemo(() => {
    if (filter === "all") return mockReservations;
    return mockReservations.filter((r) => r.status === filter);
  }, [filter]);

  const counts = React.useMemo(() => ({
    all: mockReservations.length,
    bekleyen: mockReservations.filter((r) => r.status === "bekleyen").length,
    onayli: mockReservations.filter((r) => r.status === "onayli").length,
    iptal: mockReservations.filter((r) => r.status === "iptal").length,
  }), []);

  return (
    <div className="flex flex-col gap-4">
      <Tabs
        defaultValue="all"
        onValueChange={(val) => val && setFilter(val)}
      >
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1 text-xs">
            Tümü ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="bekleyen" className="flex-1 text-xs">
            Bekleyen ({counts.bekleyen})
          </TabsTrigger>
          <TabsTrigger value="onayli" className="flex-1 text-xs">
            Onaylı ({counts.onayli})
          </TabsTrigger>
          <TabsTrigger value="iptal" className="flex-1 text-xs">
            İptal ({counts.iptal})
          </TabsTrigger>
        </TabsList>

        {["all", "bekleyen", "onayli", "iptal"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue}>
            <ScrollArea className="h-[calc(100vh-260px)]">
              <div className="flex flex-col gap-3 pb-4">
                {filteredReservations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CalendarDays className="size-10 mb-3 opacity-40" />
                    <p className="text-sm">Bu filtrede rezervasyon yok</p>
                  </div>
                ) : (
                  filteredReservations.map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      onTap={(r) => onSelectReservation?.(r)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
