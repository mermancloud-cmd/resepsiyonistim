"use client";

import * as React from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Landmark,
  Search,
  CalendarRange,
  Link2,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { IbanDetailsForm } from "@/components/payments/iban-details-form";
import { PaymentActionModal } from "@/components/payments/payment-action-modal";

// ─── Hooks ─────────────────────────────────────────────────────────────────────

import {
  useIBANPayments,
  useApprovePayment,
  useRejectPayment,
  useAutoMatchPayment,
  type PaymentFilters,
  type IBANPayment,
} from "@/hooks/use-iban-payments";
import {
  useOwnerIBANs,
  useAddIBAN,
  useSetDefaultIBAN,
  useDeleteIBAN,
} from "@/hooks/use-owner-ibans";

// ─── Status helpers ────────────────────────────────────────────────────────────

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
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── IBAN Payment Card (list item) ─────────────────────────────────────────────

function IBANPaymentCard({
  payment,
  onSelect,
  onAutoMatch,
  isMatching,
}: {
  payment: IBANPayment;
  onSelect: (id: string) => void;
  onAutoMatch?: (id: string, ref: string) => void;
  isMatching?: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const status = statusConfig[payment.status];
  const StatusIcon = status.icon;

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">
                  {payment.guest_name}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 shrink-0",
                    status.color
                  )}
                >
                  {status.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {payment.room_name} · {formatDate(payment.check_in_date)}
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <Banknote className="size-3.5 text-primary" />
                <span className="font-semibold text-base">
                  ₺{payment.amount.toLocaleString("tr-TR")}
                </span>
                <span className="text-xs text-muted-foreground">
                  ····{payment.iban_last4}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <StatusIcon
                className={cn(
                  "size-4",
                  payment.status === "pending" && "text-amber-500",
                  payment.status === "approved" && "text-emerald-500",
                  payment.status === "rejected" && "text-red-500"
                )}
              />
              {expanded ? (
                <ChevronUp className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardContent>
      </button>

      {expanded && (
        <div className="border-t border-border/50 bg-muted/30 px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Telefon</span>
              <p className="font-medium">{payment.guest_phone}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Referans</span>
              <p className="font-medium font-mono text-[11px]">
                {payment.reference_code}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Gönderim</span>
              <p className="font-medium">
                {formatDate(payment.submitted_at)}{" "}
                {formatTime(payment.submitted_at)}
              </p>
            </div>
            {payment.reviewed_at && (
              <div>
                <span className="text-muted-foreground">İnceleme</span>
                <p className="font-medium">
                  {formatDate(payment.reviewed_at)}{" "}
                  {formatTime(payment.reviewed_at)}
                </p>
              </div>
            )}
          </div>

          {payment.notes && (
            <div className="text-xs">
              <span className="text-muted-foreground">Not</span>
              <p className="mt-0.5">{payment.notes}</p>
            </div>
          )}

          <div className="flex gap-2">
            {payment.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(payment.id);
                }}
              >
                <CreditCard className="size-3.5" />
                Ödeme İşlemi Yap
              </Button>
            )}

            {/* Auto-match button for pending payments with reference codes */}
            {payment.status === "pending" && payment.reference_code && onAutoMatch && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onAutoMatch(payment.id, payment.reference_code);
                }}
                disabled={isMatching}
                title="Rezervasyonla otomatik eşleştir"
              >
                {isMatching ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Link2 className="size-3.5" />
                )}
                Eşleştir
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Summary Strip ─────────────────────────────────────────────────────────────

function PaymentSummaryStrip({ payments }: { payments: IBANPayment[] }) {
  const pending = payments.filter((p) => p.status === "pending");
  const approved = payments.filter((p) => p.status === "approved");
  const pendingTotal = pending.reduce((s, p) => s + p.amount, 0);
  const approvedTotal = approved.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-center ring-1 ring-amber-200 dark:ring-amber-800">
        <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
          {pending.length}
        </p>
        <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-0.5">
          Bekleyen
        </p>
      </div>
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-3 text-center ring-1 ring-emerald-200 dark:ring-emerald-800">
        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
          {approved.length}
        </p>
        <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">
          Onaylı
        </p>
      </div>
      <div className="rounded-xl bg-teal-50 dark:bg-teal-900/20 p-3 text-center ring-1 ring-teal-200 dark:ring-teal-800">
        <p className="text-lg font-bold text-teal-700 dark:text-teal-400">
          ₺{(pendingTotal + approvedTotal).toLocaleString("tr-TR")}
        </p>
        <p className="text-[10px] text-teal-600 dark:text-teal-500 mt-0.5">
          Toplam
        </p>
      </div>
    </div>
  );
}

// ─── Date Range Filter ─────────────────────────────────────────────────────────

function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClear,
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onClear: () => void;
}) {
  const hasFilter = dateFrom || dateTo;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
          <CalendarRange className="size-3.5" />
          Tarih Aralığı
        </Label>
        {hasFilter && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onClear}
            className="text-muted-foreground"
          >
            <X className="size-3" />
            Temizle
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="text-xs h-8"
          placeholder="Başlangıç"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="text-xs h-8"
          placeholder="Bitiş"
        />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── Filter state ───────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [selectedPaymentId, setSelectedPaymentId] = React.useState<
    string | null
  >(null);
  const [showDateFilter, setShowDateFilter] = React.useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Build filters object ─────────────────────────────────────────────
  const filters: PaymentFilters = React.useMemo(
    () => ({
      status: statusFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: debouncedSearch || undefined,
    }),
    [statusFilter, dateFrom, dateTo, debouncedSearch]
  );

  // ── Data hooks ───────────────────────────────────────────────────────
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    isFetching: paymentsFetching,
  } = useIBANPayments(filters);

  const approveMutation = useApprovePayment();
  const rejectMutation = useRejectPayment();
  const autoMatchMutation = useAutoMatchPayment();

  // ── Owner IBAN hooks ─────────────────────────────────────────────────
  const { data: ownerIbans = [], isLoading: ibansLoading } = useOwnerIBANs();
  const addIbanMutation = useAddIBAN();
  const setDefaultIbanMutation = useSetDefaultIBAN();
  const deleteIbanMutation = useDeleteIBAN();

  // ── Optimistic local state overlay ──────────────────────────────────
  // For immediate UI feedback when Supabase is unavailable
  const [localPayments, setLocalPayments] = React.useState<IBANPayment[]>([]);
  const effectivePayments =
    localPayments.length > 0 ? localPayments : payments;

  // Sync when remote data arrives
  React.useEffect(() => {
    if (payments.length > 0) {
      setLocalPayments([]);
    }
  }, [payments]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const selectedPayment = selectedPaymentId
    ? effectivePayments.find((p) => p.id === selectedPaymentId) ?? null
    : null;

  const handleApprove = (id: string, notes?: string) => {
    // Optimistic update
    setLocalPayments((prev) => {
      const base = prev.length > 0 ? prev : payments;
      return base.map((p) =>
        p.id === id
          ? {
              ...p,
              status: "approved" as const,
              reviewed_at: new Date().toISOString(),
              reviewed_by: "admin",
              notes: notes ?? "Manuel onaylandı.",
            }
          : p
      );
    });
    approveMutation.mutate({ id, notes });
    setSelectedPaymentId(null);
  };

  const handleReject = (id: string, notes?: string) => {
    // Optimistic update
    setLocalPayments((prev) => {
      const base = prev.length > 0 ? prev : payments;
      return base.map((p) =>
        p.id === id
          ? {
              ...p,
              status: "rejected" as const,
              reviewed_at: new Date().toISOString(),
              reviewed_by: "admin",
              notes: notes ?? "Manuel reddedildi.",
            }
          : p
      );
    });
    rejectMutation.mutate({ id, notes });
    setSelectedPaymentId(null);
  };

  const handleAutoMatch = (paymentId: string, referenceCode: string) => {
    autoMatchMutation.mutate({ paymentId, referenceCode });
  };

  // ── Owner IBAN handlers ──────────────────────────────────────────────

  const handleAddIBAN = (input: { bank_name: string; account_holder: string; iban: string; currency: string }) => {
    addIbanMutation.mutate(input);
  };

  const handleSetDefaultIBAN = (id: string) => {
    setDefaultIbanMutation.mutate(id);
  };

  const handleDeleteIBAN = (id: string, wasDefault: boolean) => {
    deleteIbanMutation.mutate({ id, wasDefault });
  };

  // ── Derived data ─────────────────────────────────────────────────────

  const pendingCount = effectivePayments.filter(
    (p) => p.status === "pending"
  ).length;

  const isMutating =
    approveMutation.isPending || rejectMutation.isPending;

  if (!isMounted) return null;

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-4">
        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <CreditCard className="size-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Ödemeler</h2>
            <p className="text-xs text-muted-foreground">
              IBAN yönetimi, havale takibi ve abonelik durumu
            </p>
          </div>
        </div>

        {/* ── Main tabs ───────────────────────────────────────────── */}
        <Tabs defaultValue="iban" onValueChange={() => setSelectedPaymentId(null)}>
          <TabsList className="w-full">
            <TabsTrigger value="iban">
              <Landmark className="size-3.5" />
              IBAN Hesaplarım
            </TabsTrigger>
            <TabsTrigger value="tracking">
              <Banknote className="size-3.5" />
              Ödeme Takibi
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: IBAN Management ──────────────────────────── */}
          <TabsContent value="iban" className="mt-3">
            <div className="flex flex-col gap-4">
              {/* IBAN accounts form - now connected to Supabase */}
              <IbanDetailsForm
                ibans={ownerIbans}
                isLoading={ibansLoading}
                onAdd={handleAddIBAN}
                onSetDefault={handleSetDefaultIBAN}
                onDelete={handleDeleteIBAN}
                isAdding={addIbanMutation.isPending}
                isMutating={
                  setDefaultIbanMutation.isPending ||
                  deleteIbanMutation.isPending
                }
              />

              <Separator />

              {/* IBAN yönetimi — abonelik IBAN ile yapılıyor */}
            </div>
          </TabsContent>

          {/* ── Tab 2: Payment Tracking ─────────────────────────── */}
          <TabsContent value="tracking" className="mt-3">
            <div className="flex flex-col gap-4">
              {/* Detail view when a payment is selected */}
              {selectedPayment ? (
                <PaymentActionModal
                  payment={selectedPayment}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onClose={() => setSelectedPaymentId(null)}
                />
              ) : (
                <>
                  {/* Summary */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Banknote className="size-4 text-primary" />
                      IBAN Havale / EFT Takibi
                      {paymentsFetching && (
                        <Loader2 className="size-3 animate-spin text-muted-foreground" />
                      )}
                    </h3>
                    <PaymentSummaryStrip payments={effectivePayments} />
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Misafir adı veya referans kodu ara..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSearchQuery(e.target.value)
                      }
                      className="pl-9 h-9 text-sm"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="size-3" />
                      </Button>
                    )}
                  </div>

                  {/* Date range toggle */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant={showDateFilter ? "default" : "outline"}
                      size="xs"
                      onClick={() => setShowDateFilter(!showDateFilter)}
                    >
                      <CalendarRange className="size-3" />
                      Tarih Filtresi
                    </Button>
                    {(dateFrom || dateTo) && (
                      <Badge variant="secondary" className="text-[10px]">
                        Aktif
                      </Badge>
                    )}
                  </div>

                  {/* Date range filter (collapsible) */}
                  {showDateFilter && (
                    <DateRangeFilter
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      onDateFromChange={setDateFrom}
                      onDateToChange={setDateTo}
                      onClear={() => {
                        setDateFrom("");
                        setDateTo("");
                      }}
                    />
                  )}

                  {/* Filter tabs */}
                  <Tabs
                    defaultValue="all"
                    onValueChange={(v) =>
                      setStatusFilter(
                        v as "all" | "pending" | "approved" | "rejected"
                      )
                    }
                  >
                    <TabsList className="w-full">
                      <TabsTrigger value="all">Tümü</TabsTrigger>
                      <TabsTrigger value="pending">Bekleyen</TabsTrigger>
                      <TabsTrigger value="approved">Onaylı</TabsTrigger>
                      <TabsTrigger value="rejected">Reddedilen</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Payment list */}
                  <div className="flex flex-col gap-2">
                    {paymentsLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground mt-2">
                          Ödemeler yükleniyor...
                        </p>
                      </div>
                    ) : effectivePayments.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <RefreshCw className="size-8 mx-auto mb-2 opacity-50" />
                        <p>Bu kategoride ödeme bulunamadı.</p>
                        {(searchQuery || dateFrom || dateTo || statusFilter !== "all") && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="mt-2"
                            onClick={() => {
                              setSearchQuery("");
                              setDateFrom("");
                              setDateTo("");
                              setStatusFilter("all");
                            }}
                          >
                            Filtreleri Temizle
                          </Button>
                        )}
                      </div>
                    ) : (
                      effectivePayments.map((payment) => (
                        <IBANPaymentCard
                          key={payment.id}
                          payment={payment}
                          onSelect={setSelectedPaymentId}
                          onAutoMatch={handleAutoMatch}
                          isMatching={
                            autoMatchMutation.isPending &&
                            autoMatchMutation.variables?.paymentId ===
                              payment.id
                          }
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileShell>
  );
}
