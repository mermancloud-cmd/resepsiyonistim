"use client";
import * as React from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Gift,
  Users,
  TrendingUp,
  TicketPercent,
  Copy,
  Plus,
  RefreshCw,
  Link as LinkIcon,
  Share2,
  Check,
  Percent,
  Banknote,
  Moon,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { cn, formatRelativeTime, formatDate } from "@/lib/utils";
import {
  useReferralStats,
  useReferrals,
  useReferralCodes,
  useCreateReferral,
  useUpdateReferralStatus,
  useCreateReferralCode,
  useToggleReferralCode,
} from "@/hooks/use-referrals";
import { mockReferralStats, mockReferrals, mockReferralCodes } from "@/lib/mock-data";
import type { ReferralStatus, ReferralCode, Referral } from "@/lib/types";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: "all", label: "Tümü" },
  { value: "pending", label: "Bekleyen" },
  { value: "converted", label: "Dönüşen" },
  { value: "rewarded", label: "Ödüllü" },
  { value: "expired", label: "Süresi Dolmuş" },
] as const;

const STATUS_BADGE: Record<ReferralStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Bekliyor", variant: "secondary" },
  converted: { label: "Dönüştü", variant: "default" },
  rewarded: { label: "Ödüllendi", variant: "outline" },
  expired: { label: "Süresi Doldu", variant: "destructive" },
};

const REWARD_LABELS: Record<string, string> = {
  discount: "İndirim",
  credit: "Kredi",
  free_night: "Ücretsiz Gece",
  cash: "Nakit",
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-2xl font-bold tracking-tight">{value}</span>
            {subtext && (
              <span className="text-[10px] text-muted-foreground">{subtext}</span>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="size-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Referral Row ──────────────────────────────────────────────────────────────

function ReferralRow({
  referral,
  onMarkRewarded,
}: {
  referral: Referral;
  onMarkRewarded?: (id: string) => void;
}) {
  const statusCfg = STATUS_BADGE[referral.status as ReferralStatus];

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/50 p-3.5">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            {referral.referrer_name}
          </span>
          <span className="text-xs text-muted-foreground">
            {referral.referrer_phone.replace(/(\d{5})(\d+)/, "$1****")}
          </span>
        </div>
        <Badge variant={statusCfg.variant} className="text-[10px]">
          {statusCfg.label}
        </Badge>
      </div>

      {referral.referee_name && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="size-3 shrink-0" />
          <span>
            {referral.referee_name}
            {referral.referee_phone && ` · ${referral.referee_phone.replace(/(\d{5})(\d+)/, "$1****")}`}
          </span>
        </div>
      )}

      <Separator className="my-0.5" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs">
          <Gift className="size-3 text-amber-500" />
          <span className="font-medium text-foreground">
            {REWARD_LABELS[referral.reward_type]}: {referral.reward_type === "free_night"
              ? `${referral.reward_amount} Gece`
              : `${referral.reward_amount.toLocaleString("tr-TR")} ${referral.reward_currency}`}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {formatRelativeTime(referral.created_at)}
        </span>
      </div>

      {referral.notes && (
        <p className="text-[11px] text-muted-foreground italic">
          {referral.notes}
        </p>
      )}

      {referral.status === "converted" && onMarkRewarded && (
        <Button
          variant="outline"
          size="sm"
          className="mt-1 h-8 text-xs"
          onClick={() => onMarkRewarded(referral.id)}
        >
          <Check className="mr-1 size-3" />
          Ödüllendir
        </Button>
      )}
    </div>
  );
}

// ─── Referral Code Card ────────────────────────────────────────────────────────

function ReferralCodeCard({
  code,
  onToggle,
  onCopy,
}: {
  code: ReferralCode;
  onToggle: (id: string, active: boolean) => void;
  onCopy: (code: string) => void;
}) {
  const usesLeft = code.max_uses != null ? code.max_uses - code.current_uses : "∞";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/50 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <code className="rounded-md bg-muted px-2 py-1 text-sm font-bold tracking-wider text-primary">
            {code.code}
          </code>
          <button
            onClick={() => onCopy(code.code)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Kodu kopyala"
          >
            <Copy className="size-3.5" />
          </button>
        </div>
        <Switch
          checked={code.is_active}
          onCheckedChange={(checked) => onToggle(code.id, checked)}
        />
      </div>

      <p className="text-xs text-muted-foreground">{code.description}</p>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>
          {REWARD_LABELS[code.reward_type]}: {code.reward_type === "free_night"
            ? `${code.reward_amount} Gece`
            : `${code.reward_amount.toLocaleString("tr-TR")} ${code.reward_currency}`}
        </span>
        <span>·</span>
        <span>Kullanım: {code.current_uses}/{code.max_uses ?? "∞"}</span>
        {code.expires_at && (
          <>
            <span>·</span>
            <span>Son: {formatDate(code.expires_at)}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── New Referral Code Form ────────────────────────────────────────────────────

const REWARD_TYPES = [
  { value: "discount", label: "İndirim", icon: Percent },
  { value: "credit", label: "Kredi", icon: Banknote },
  { value: "free_night", label: "Ücretsiz Gece", icon: Moon },
  { value: "cash", label: "Nakit", icon: Banknote },
] as const;

function NewCodeForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const createCode = useCreateReferralCode();
  const [rewardType, setRewardType] = React.useState<string>("discount");
  const [rewardAmount, setRewardAmount] = React.useState("500");
  const [description, setDescription] = React.useState("");
  const [maxUses, setMaxUses] = React.useState("50");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Lütfen bir açıklama girin");
      return;
    }
    const amount = parseFloat(rewardAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Geçerli bir ödül miktarı girin");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCode.mutateAsync({
        description: description.trim(),
        reward_type: rewardType as ReferralCode["reward_type"],
        reward_amount: amount,
        reward_currency: "TRY",
        max_uses: parseInt(maxUses) || undefined,
      });
      toast.success("Referans kodu oluşturuldu!");
      onCreated();
    } catch {
      toast.error("Kod oluşturulamadı");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-border/50 bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Yeni Referans Kodu</h4>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Ödül Türü</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {REWARD_TYPES.map((rt) => {
              const Icon = rt.icon;
              return (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setRewardType(rt.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-all",
                    rewardType === rt.value
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                      : "border-border/50 hover:border-border text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  <span className="leading-tight">{rt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Ödül Miktarı</Label>
          <Input
            type="number"
            min={1}
            value={rewardAmount}
            onChange={(e) => setRewardAmount(e.target.value)}
            placeholder="500"
            className="h-9 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Açıklama</Label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Arkadaşını getir 500₺ indirim"
            className="h-9 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Maksimum Kullanım</Label>
          <Input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="50"
            className="h-9 w-24 text-sm"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-9 text-sm"
      >
        {isSubmitting ? "Oluşturuluyor..." : "Kodu Oluştur"}
      </Button>
    </form>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-4 w-full animate-pulse rounded bg-muted",
        className
      )}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/50 p-3.5">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <SkeletonLine className="h-4 w-28" />
          <SkeletonLine className="h-3 w-20" />
        </div>
        <SkeletonLine className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonLine className="h-3 w-full" />
      <SkeletonLine className="h-3 w-3/4" />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ReferralPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => { setIsMounted(true); }, []);
  if (!isMounted) return null;

  return <ReferralPageContent />;
}

function ReferralPageContent() {
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [showNewCode, setShowNewCode] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("referrals");

  // Live data
  const { data: statsData, isLoading: statsLoading } = useReferralStats();
  const { data: referralsData, isLoading: referralsLoading } = useReferrals(statusFilter === "all" ? undefined : statusFilter);
  const { data: codesData, isLoading: codesLoading } = useReferralCodes();

  // Mutations
  const updateStatus = useUpdateReferralStatus();
  const toggleCode = useToggleReferralCode();

  // Fallback to mock when live data not available (static export)
  const stats = statsData ?? mockReferralStats;
  const referrals = referralsData?.referrals ?? mockReferrals;
  const codes = codesData?.codes ?? mockReferralCodes;

  const handleMarkRewarded = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: "rewarded" });
      toast.success("Referans ödüllendirildi");
    } catch {
      toast.error("Güncellenemedi");
    }
  };

  const handleToggleCode = async (id: string, isActive: boolean) => {
    try {
      await toggleCode.mutateAsync({ id, is_active: isActive });
      toast.success(isActive ? "Kod aktifleştirildi" : "Kod devre dışı bırakıldı");
    } catch {
      toast.error("Güncellenemedi");
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Kod kopyalandı");
    } catch {
      toast.error("Kopyalanamadı");
    }
  };

  return (
    <MobileShell>
      <div className="flex flex-col gap-4 pb-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="size-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Referans Programı</h2>
              <p className="text-xs text-muted-foreground">
                Müşteri yönlendirme ve ödüllendirme
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Users}
            label="Toplam Referans"
            value={stats.total_referrals}
            subtext={`${stats.pending_count} bekleyen`}
          />
          <StatCard
            icon={TrendingUp}
            label="Dönüşüm Oranı"
            value={`%${stats.conversion_rate}`}
            subtext={`${stats.converted_count} dönüşen`}
          />
          <StatCard
            icon={Gift}
            label="Ödüllendirilen"
            value={stats.rewarded_count}
            subtext={`${stats.total_reward_amount.toLocaleString("tr-TR")} ₺ dağıtıldı`}
          />
          <StatCard
            icon={TicketPercent}
            label="Aktif Kodlar"
            value={stats.active_codes}
            subtext="Referans kodları"
          />
        </div>

        {/* Referral link share card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Share2 className="size-4 text-primary" />
                <span className="text-sm font-medium">Referans Bağlantınız</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  panel.merman.sbs/kayit?ref={codes[0]?.code ?? "DAVET500"}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-9 text-xs"
                  onClick={() => {
                    const link = `panel.merman.sbs/kayit?ref=${codes[0]?.code ?? "DAVET500"}`;
                    navigator.clipboard.writeText(link);
                    toast.success("Bağlantı kopyalandı");
                  }}
                >
                  <Copy className="mr-1 size-3" />
                  Kopyala
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Bu bağlantıyı müşterilerinizle paylaşarak yeni rezervasyon kazanın
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Referrals | Codes */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="referrals">Referanslar</TabsTrigger>
            <TabsTrigger value="codes">Kodlar</TabsTrigger>
          </TabsList>

          {/* ─── Tab: Referrals ─────────────────────────────────────────────── */}
          <TabsContent value="referrals" className="mt-3">
            {/* Status filter chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    statusFilter === f.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Referral list */}
            <div className="mt-3 flex flex-col gap-2.5">
              {referralsLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : referrals.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <Users className="size-8" />
                  <p className="text-sm">Henüz referans kaydı yok</p>
                </div>
              ) : (
                referrals.map((ref) => (
                  <ReferralRow
                    key={ref.id}
                    referral={ref}
                    onMarkRewarded={handleMarkRewarded}
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* ─── Tab: Codes ─────────────────────────────────────────────────── */}
          <TabsContent value="codes" className="mt-3">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Referans Kodları</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowNewCode(!showNewCode)}
                >
                  <Plus className="mr-1 size-3" />
                  Yeni Kod
                </Button>
              </div>

              {showNewCode && (
                <NewCodeForm
                  onClose={() => setShowNewCode(false)}
                  onCreated={() => setShowNewCode(false)}
                />
              )}

              {codesLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : codes.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <TicketPercent className="size-8" />
                  <p className="text-sm">Henüz referans kodu oluşturulmamış</p>
                </div>
              ) : (
                codes.map((c) => (
                  <ReferralCodeCard
                    key={c.id}
                    code={c}
                    onToggle={handleToggleCode}
                    onCopy={handleCopyCode}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileShell>
  );
}
