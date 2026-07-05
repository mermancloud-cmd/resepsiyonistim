"use client";

/**
 * Reservation Action Confirmation Page
 *
 * Two-step flow for owner reservation approval (WF08):
 * 1. Owner clicks Telegram link (GET) → arrives here with signed params
 * 2. Owner confirms action → POST to n8n webhook via nginx proxy
 *
 * This replaces the old insecure GET-based state-changing webhook.
 * The GET webhook now redirects to this page; the actual state change
 * happens via authenticated POST.
 *
 * Security:
 * - HMAC token validated server-side by n8n (client-side pre-check only)
 * - POST request includes original HMAC token for re-validation
 * - CSRF protection via double-submit cookie pattern
 * - Rate limited at nginx level (api_limit zone)
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Pause,
  Info,
  Loader2,
  Shield,
  AlertTriangle,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  parseActionParams,
  validateActionParams,
  buildConfirmBody,
  ACTION_LABELS,
  ACTION_COLORS,
  type OwnerActionParams,
} from "@/lib/hmac-utils";
import { getCSRFToken } from "@/lib/csrf";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionState =
  | "loading"
  | "valid"
  | "invalid"
  | "confirming"
  | "success"
  | "error";

interface ActionResult {
  success: boolean;
  message: string;
  html?: string;
}

// ─── Action Config ────────────────────────────────────────────────────────────

const ACTION_CONFIG = {
  approve: {
    icon: CheckCircle,
    title: "Rezervasyonu Onayla",
    description:
      "Bu rezervasyonu onaylamak istediğinize emin misiniz? Misafir otomatik olarak bilgilendirilecektir.",
    confirmLabel: "Evet, Onayla",
    successTitle: "Rezervasyon Onaylandı",
    successDescription: "Misafir bilgilendirildi.",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  reject: {
    icon: XCircle,
    title: "Rezervasyonu Reddet",
    description:
      "Bu rezervasyonu reddetmek istediğinize emin misiniz? Tarih kilidi serbest bırakılacak ve misafir bilgilendirilecektir.",
    confirmLabel: "Evet, Reddet",
    successTitle: "Rezervasyon Reddedildi",
    successDescription: "Misafir bilgilendirildi, tarih kilidi serbest bırakıldı.",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    borderColor: "border-red-200 dark:border-red-800",
    iconColor: "text-red-600 dark:text-red-400",
  },
  hold: {
    icon: Pause,
    title: "Rezervasyonu Beklet",
    description:
      "Bu rezervasyonu beklemeye almak istediğinize emin misiniz? Tarihler geçici olarak korunacaktır.",
    confirmLabel: "Evet, Beklet",
    successTitle: "Rezervasyon Beklemeye Alındı",
    successDescription: "Tarihler geçici olarak korunuyor.",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  info: {
    icon: Info,
    title: "Misafirden Bilgi İste",
    description:
      "Misafirden ek bilgi istemek üzeresiniz. Misafire bildirim gönderilecektir.",
    confirmLabel: "Evet, Bilgi İste",
    successTitle: "Bilgi Talep Edildi",
    successDescription: "Misafire bildirim gönderildi.",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default function ReservationActionPage() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<ActionState>("loading");
  const [params, setParams] = useState<OwnerActionParams | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);

  // ── Parse & validate URL parameters ──────────────────────────────────────
  useEffect(() => {
    const parsed = parseActionParams(searchParams);

    if (!parsed) {
      setState("invalid");
      setError(
        "Geçersiz veya eksik bağlantı parametreleri. Lütfen Telegram'dan gelen bağlantıyı tekrar tıklayın."
      );
      return;
    }

    const validation = validateActionParams(parsed);
    if (!validation.valid) {
      setState("invalid");
      setError(validation.reason || "Geçersiz bağlantı.");
      return;
    }

    setParams(parsed);
    setState("valid");
  }, [searchParams]);

  // ── Confirm action (POST to n8n webhook) ─────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!params) return;

    setState("confirming");

    try {
      const body = buildConfirmBody(params);
      const bodyStr = JSON.stringify(body);

      // Build headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      };

      // Add CSRF token if available
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }

      // POST to n8n webhook via nginx proxy
      const response = await fetch("/api/n8n/owner-action-confirm", {
        method: "POST",
        headers,
        body: bodyStr,
        credentials: "include",
      });

      const contentType = response.headers.get("Content-Type") || "";

      // Handle HTML response (n8n returns HTML for success/error pages)
      if (contentType.includes("text/html")) {
        const html = await response.text();
        if (response.ok) {
          setResult({
            success: true,
            message: ACTION_CONFIG[params.action].successDescription,
            html,
          });
          setState("success");
        } else {
          setResult({
            success: false,
            message: "İşlem başarısız oldu.",
            html,
          });
          setState("error");
        }
        return;
      }

      // Handle JSON response
      const data = await response.json().catch(() => null);

      if (response.ok) {
        setResult({
          success: true,
          message:
            data?.message || ACTION_CONFIG[params.action].successDescription,
        });
        setState("success");
      } else if (response.status === 401) {
        setResult({
          success: false,
          message:
            "Bu bağlantı geçersiz veya süresi dolmuş. Lütfen yeni bir bildirim isteyin.",
        });
        setState("error");
      } else if (response.status === 429) {
        setResult({
          success: false,
          message: "Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin.",
        });
        setState("error");
      } else {
        setResult({
          success: false,
          message:
            data?.error ||
            data?.message ||
            "İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.",
        });
        setState("error");
      }
    } catch (err) {
      setResult({
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.",
      });
      setState("error");
    }
  }, [params]);

  // ── Render ───────────────────────────────────────────────────────────────

  // Loading state
  if (state === "loading") {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Bağlantı doğrulanıyor…</p>
        </div>
      </PageShell>
    );
  }

  // Invalid state
  if (state === "invalid" || !params) {
    const config = ACTION_CONFIG.approve;
    return (
      <PageShell>
        <div
          className={cn(
            "rounded-2xl border p-6 text-center",
            "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
          )}
        >
          <AlertTriangle className="mx-auto mb-4 size-12 text-red-500" />
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            Geçersiz Bağlantı
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">{error}</p>
          <a
            href="/reservations"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ArrowLeft className="mr-2 size-4" />
            Rezervasyonlara Dön
          </a>
        </div>
      </PageShell>
    );
  }

  const config = ACTION_CONFIG[params.action];
  const ActionIcon = config.icon;

  // Success state
  if (state === "success" && result) {
    return (
      <PageShell>
        <div
          className={cn(
            "rounded-2xl border p-6 text-center",
            config.bgColor,
            config.borderColor
          )}
        >
          <ActionIcon className={cn("mx-auto mb-4 size-12", config.iconColor)} />
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            {config.successTitle}
          </h1>
          <p className="mb-2 text-sm text-muted-foreground">
            {result.message}
          </p>
          <p className="mb-6 text-xs text-muted-foreground">
            Rezervasyon:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
              {params.reservation_id.slice(0, 8)}…
            </code>
          </p>

          {/* Render n8n HTML response if available */}
          {result.html && (
            <div className="mb-6 rounded-lg bg-background p-4 text-left text-sm">
              <div
                dangerouslySetInnerHTML={{ __html: result.html }}
                className="[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_p]:mb-1"
              />
            </div>
          )}

          <div className="flex gap-3">
            <a
              href="/reservations"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
            >
              <ArrowLeft className="mr-2 size-4" />
              Rezervasyonlara Dön
            </a>
            <a
              href="/dashboard"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
            >
              Kontrol Paneli
            </a>
          </div>
        </div>
      </PageShell>
    );
  }

  // Error state
  if (state === "error" && result) {
    return (
      <PageShell>
        <div
          className={cn(
            "rounded-2xl border p-6 text-center",
            "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
          )}
        >
          <AlertTriangle className="mx-auto mb-4 size-12 text-red-500" />
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            İşlem Başarısız
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">{result.message}</p>
          <div className="flex gap-3">
            <Button
              onClick={() => setState("valid")}
              variant="outline"
              className="flex-1"
            >
              Tekrar Dene
            </Button>
            <a
              href="/reservations"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
            >
              Rezervasyonlara Dön
            </a>
          </div>
        </div>
      </PageShell>
    );
  }

  // Confirmation state (valid or confirming)
  return (
    <PageShell>
      <div
        className={cn(
          "rounded-2xl border p-6",
          config.bgColor,
          config.borderColor
        )}
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <ActionIcon className={cn("mx-auto mb-3 size-12", config.iconColor)} />
          <h1 className="text-xl font-semibold text-foreground">
            {config.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {config.description}
          </p>
        </div>

        {/* Reservation Info */}
        <div className="mb-6 rounded-xl bg-background/50 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Rezervasyon Bilgileri
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rezervasyon No</span>
              <code className="font-mono text-xs">
                {params.reservation_id.slice(0, 8)}…
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">İşlem</span>
              <span className="font-medium">
                {ACTION_LABELS[params.action]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bildirim Zamanı</span>
              <span className="text-xs">
                {new Date(parseInt(params.ts, 10) * 1000).toLocaleString(
                  "tr-TR",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Security indicator */}
        <div className="mb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="size-3.5" />
          <span>Bu işlem HMAC ile imzalanmış ve güvenli bir şekilde doğrulanacaktır.</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <a
            href="/reservations"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "flex-1")}
          >
            İptal
          </a>
          <Button
            onClick={handleConfirm}
            disabled={state === "confirming"}
            size="lg"
            className={cn("flex-1 text-white", ACTION_COLORS[params.action])}
          >
            {state === "confirming" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ActionIcon className="mr-2 size-4" />
            )}
            {state === "confirming" ? "İşleniyor…" : config.confirmLabel}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

// ─── Page Shell (centered layout for action pages) ────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8">
      {/* Brand */}
      <div className="mb-6 text-center">
        <div className="mb-2 inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <span className="text-lg font-bold">B</span>
        </div>
        <p className="text-xs text-muted-foreground">İşletme Yönetim Paneli</p>
      </div>

      {/* Content card */}
      <div className="w-full max-w-md">{children}</div>

      {/* Footer */}
      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3" />
        Bağlantılar 24 saat geçerlidir
      </p>
    </div>
  );
}
