"use client";
import * as React from "react";


import { MobileShell } from "@/components/layout/mobile-shell";
import { ReservationList } from "@/components/reservations/reservation-list";
import { ReservationCalendar } from "@/components/reservations/reservation-calendar";
import { ReservationDetail } from "@/components/reservations/reservation-detail";
import { List, CalendarDays, Plus, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/lib/types";

type ViewMode = "list" | "calendar";

export default function ReservationsPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => { setIsMounted(true); }, []);
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [selectedReservation, setSelectedReservation] =
    React.useState<Reservation | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  if (!isMounted) return null;

  const handleSelectReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setDetailOpen(true);
  };

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-5 text-teal-600" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Rezervasyonlar
              </h2>
              <p className="text-xs text-muted-foreground">
                Konaklama kayıtlarını yönetin
              </p>
            </div>
          </div>

          {/* Segmented Control */}
          <div className="flex items-center rounded-lg bg-muted p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="size-3.5" />
              Liste
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                viewMode === "calendar"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarDays className="size-3.5" />
              Takvim
            </button>
          </div>
        </div>

        {/* Content */}
        {viewMode === "list" ? (
          <ReservationList onSelectReservation={handleSelectReservation} />
        ) : (
          <ReservationCalendar />
        )}

        {/* FAB - Manual Reservation Entry */}
        <button className="fixed bottom-20 right-5 flex items-center gap-2 rounded-full bg-teal-600 px-5 py-3.5 text-white shadow-lg shadow-teal-600/25 hover:bg-teal-700 active:scale-95 transition-all z-20">
          <Plus className="size-5" />
          <span className="text-sm font-medium">Yeni Rezervasyon</span>
        </button>

        {/* Detail Sheet */}
        <ReservationDetail
          reservation={selectedReservation}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      </div>
    </MobileShell>
  );
}
