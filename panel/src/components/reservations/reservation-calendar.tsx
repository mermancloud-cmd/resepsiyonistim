"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { tr } from "date-fns/locale";
import type {
  Reservation,
  CalendarDateStatus,
} from "@/lib/types";
import { mockReservations } from "@/lib/mock-data";

const WEEKDAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const statusColors: Record<CalendarDateStatus, string> = {
  booked: "bg-teal-500 text-white",
  pending: "bg-amber-400 text-amber-950",
  available: "bg-background text-foreground ring-1 ring-border",
  blocked: "bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600 line-through",
};

function getDateStatus(date: Date, reservations: Reservation[]): CalendarDateStatus {
  const dateStr = format(date, "yyyy-MM-dd");

  for (const res of reservations) {
    const checkIn = res.checkIn;
    const checkOut = res.checkOut;

    if (dateStr >= checkIn && dateStr < checkOut) {
      if (res.status === "onayli" || res.status === "giris_yapti") return "booked";
      if (res.status === "bekleyen") return "pending";
      if (res.status === "iptal") return "available";
    }
  }

  // Block past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return "blocked";

  return "available";
}

function getReservationsForDate(
  date: Date,
  reservations: Reservation[]
): Reservation[] {
  const dateStr = format(date, "yyyy-MM-dd");
  return reservations.filter(
    (r) => dateStr >= r.checkIn && dateStr < r.checkOut
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
}

const statusLabels: Record<CalendarDateStatus, { label: string; color: string }> = {
  booked: { label: "Dolu", color: "bg-teal-500" },
  pending: { label: "Bekleyen", color: "bg-amber-400" },
  available: { label: "Müsait", color: "bg-white ring-1 ring-border" },
  blocked: { label: "Kapalı", color: "bg-gray-200 dark:bg-gray-800" },
};

export function ReservationCalendar() {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const selectedDateReservations = React.useMemo(() => {
    if (!selectedDate) return [];
    return getReservationsForDate(selectedDate, mockReservations);
  }, [selectedDate]);

  return (
    <div className="flex flex-col gap-4">
      {/* Month Navigation */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <CardTitle className="text-base">
            {format(currentMonth, "MMMM yyyy", { locale: tr })}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </CardHeader>

        <CardContent className="px-2 pb-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LABELS.map((day) => (
              <div
                key={day}
                className="text-center text-[11px] font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day) => {
              const status = getDateStatus(day, mockReservations);
              const inMonth = isSameMonth(day, currentMonth);
              const selected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative flex flex-col items-center justify-center aspect-square rounded-lg text-xs font-medium transition-all",
                    !inMonth && "opacity-30",
                    statusColors[status],
                    selected && "ring-2 ring-primary ring-offset-1",
                    isToday(day) && "font-bold"
                  )}
                >
                  <span>{format(day, "d")}</span>
                  {status === "booked" && inMonth && (
                    <span className="absolute bottom-0.5 size-1 rounded-full bg-white/70" />
                  )}
                  {status === "pending" && inMonth && (
                    <span className="absolute bottom-0.5 size-1 rounded-full bg-amber-800/50" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3 pt-3 border-t">
            {Object.entries(statusLabels).map(([key, { label, color }]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-full", color)} />
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Detail */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              {format(selectedDate, "d MMMM yyyy, EEEE", { locale: tr })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Bu tarihte rezervasyon bulunmuyor
              </p>
            ) : (
              <ScrollArea className="max-h-[200px]">
                <div className="flex flex-col gap-2">
                  {selectedDateReservations.map((res) => (
                    <div
                      key={res.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {res.guest.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {res.roomName}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <Badge
                          className={cn(
                            "text-[10px]",
                            res.status === "onayli" &&
                              "bg-emerald-100 text-emerald-800",
                            res.status === "bekleyen" &&
                              "bg-amber-100 text-amber-800",
                            res.status === "giris_yapti" &&
                              "bg-blue-100 text-blue-800",
                            res.status === "iptal" &&
                              "bg-red-100 text-red-800"
                          )}
                        >
                          {res.status === "onayli"
                            ? "Onaylı"
                            : res.status === "bekleyen"
                              ? "Bekleyen"
                              : res.status === "giris_yapti"
                                ? "Giriş Yaptı"
                                : "İptal"}
                        </Badge>
                        <span className="text-xs font-medium">
                          {formatCurrency(res.totalAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
