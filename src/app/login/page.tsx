"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Phone,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Shield,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { isValidPhone, isValidOTP, sanitizeOTP } from "@/lib/auth-utils";
import { useRateLimiter } from "@/hooks/use-rate-limiter";
import { toast } from "sonner";

// ─── Login Method Tabs ─────────────────────────────────────────────────────────

type LoginMethod = "phone" | "email" | "magic";
type PhoneStep = "input" | "otp";

const METHOD_LABELS: Record<LoginMethod, string> = {
  phone: "Telefon",
  email: "E-posta",
  magic: "Sihirli Link",
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();

  const [method, setMethod] = useState<LoginMethod>("phone");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("input");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Magic link state
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rateLimited, setRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  // Client-side rate limiter: 5 attempts per 60 seconds
  const rateLimiter = useRateLimiter({
    maxAttempts: 5,
    windowMs: 60_000,
    onLimited: () => {
      setRateLimited(true);
      setRetryAfter(60);
      toast.error("Çok fazla deneme. Lütfen 1 dakika bekleyin.");
    },
  });

  // Show session expired message
  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "session_expired") {
      setError("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
    } else if (reason === "unauthorized") {
      setError("Bu sayfaya erişmek için giriş yapmanız gerekiyor.");
    }
  }, [searchParams]);

  // Sync rate limiter state with local state
  useEffect(() => {
    setRateLimited(rateLimiter.isLimited);
    setRetryAfter(rateLimiter.retryAfter);
  }, [rateLimiter.isLimited, rateLimiter.retryAfter]);

  // Countdown timer for rate limiting
  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev <= 1) {
          setRateLimited(false);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  function formatRetryAfter(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}dk ${s}sn` : `${s}sn`;
  }

  // ─── Phone OTP: Send Code ──────────────────────────────────────────────────

  async function handleSendOTP(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!rateLimiter.checkLimit()) return;

    const fullPhone = phone.startsWith("+") ? phone : `+90${phone}`;

    if (!isValidPhone(phone) && fullPhone.replace(/\D/g, "").length < 11) {
      setError("Lütfen geçerli bir telefon numarası girin.");
      return;
    }

    setLoading(true);
    try {
      const { error: supaError } = await auth.signInWithOtp(phone);
      if (supaError) throw supaError;
      setPhoneStep("otp");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kod gönderilemedi. Lütfen tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  }

  // ─── Phone OTP: Verify Code ────────────────────────────────────────────────

  async function handleVerifyOTP(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!rateLimiter.checkLimit()) return;

    const code = otp.join("");
    if (code.length !== 6 || !isValidOTP(code)) {
      setError("Lütfen 6 haneli kodu girin.");
      return;
    }

    setLoading(true);
    try {
      const { error: supaError } = await auth.verifyOtp(phone, sanitizeOTP(code));
      if (supaError) throw supaError;
      rateLimiter.reset();
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Doğrulama başarısız oldu."
      );
    } finally {
      setLoading(false);
    }
  }

  // ─── Email + Password ──────────────────────────────────────────────────────

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!rateLimiter.checkLimit()) return;

    if (!email.includes("@")) {
      setError("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      const { error: supaError } = await auth.signInWithEmail(email, password);
      if (supaError) throw supaError;
      rateLimiter.reset();
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Giriş başarısız. E-posta ve şifrenizi kontrol edin."
      );
    } finally {
      setLoading(false);
    }
  }

  // ─── Magic Link ────────────────────────────────────────────────────────────

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!rateLimiter.checkLimit()) return;

    if (!magicEmail.includes("@")) {
      setError("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }

    setLoading(true);
    try {
      const { error: supaError } = await auth.signInWithMagicLink(magicEmail);
      if (supaError) throw supaError;
      setMagicSent(true);
      rateLimiter.reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sihirli link gönderilemedi."
      );
    } finally {
      setLoading(false);
    }
  }

  // ─── OTP input handlers ────────────────────────────────────────────────────

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  // ─── Method Switching ──────────────────────────────────────────────────────

  function switchMethod(newMethod: LoginMethod) {
    setMethod(newMethod);
    setError("");
    setPhoneStep("input");
    setMagicSent(false);
    setOtp(["", "", "", "", "", ""]);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4">
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <span className="text-2xl font-bold">B</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Bungalov
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Yönetim Paneli
        </p>
      </div>

      {/* Rate Limit Banner */}
      {rateLimited && (
        <div className="mb-4 flex w-full max-w-sm items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          <span>Çok fazla deneme. Tekrar deneyin: {formatRetryAfter(retryAfter)}</span>
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        {/* Method Tabs */}
        {phoneStep === "input" && !magicSent && (
          <div className="mb-5 flex gap-1 rounded-lg bg-muted p-1">
            {(Object.keys(METHOD_LABELS) as LoginMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMethod(m)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  method === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {METHOD_LABELS[m]}
              </button>
            ))}
          </div>
        )}

        {/* ─── Phone OTP: Input ─────────────────────────────────────── */}
        {method === "phone" && phoneStep === "input" && (
          <>
            <h2 className="mb-1 text-lg font-semibold text-foreground">
              Giriş Yap
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Telefon numaranızı girin, doğrulama kodu gönderelim.
            </p>

            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-foreground">
                  Telefon Numarası
                </label>
                <div className="flex items-center gap-2">
                  <span className="flex h-10 items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground">
                    +90
                  </span>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="5XX XXX XX XX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      autoFocus
                      disabled={rateLimited}
                      maxLength={10}
                      autoComplete="tel-national"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              {!rateLimited && rateLimiter.remaining < 5 && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="size-3" />
                  Kalan deneme: {rateLimiter.remaining}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || phone.length < 10 || rateLimited}
              >
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 size-4" />
                )}
                Kod Gönder
              </Button>
            </form>
          </>
        )}

        {/* ─── Phone OTP: Verify ────────────────────────────────────── */}
        {method === "phone" && phoneStep === "otp" && (
          <>
            <h2 className="mb-1 text-lg font-semibold text-foreground">
              Doğrulama Kodu
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">0{phone}</span>{" "}
              numarasına gönderilen 6 haneli kodu girin.
            </p>

            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-lg border bg-background text-center text-lg font-semibold text-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                      digit ? "border-primary" : "border-border"
                    )}
                    aria-label={`Kod hanesi ${i + 1}`}
                    disabled={rateLimited}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {error && <p className="text-center text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || otp.join("").length < 6 || rateLimited}
              >
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 size-4" />
                )}
                Doğrula ve Giriş Yap
              </Button>

              <button
                type="button"
                onClick={() => {
                  setPhoneStep("input");
                  setOtp(["", "", "", "", "", ""]);
                  setError("");
                }}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Numarayı değiştir
              </button>
            </form>
          </>
        )}

        {/* ─── Email + Password ─────────────────────────────────────── */}
        {method === "email" && (
          <>
            <h2 className="mb-1 text-lg font-semibold text-foreground">
              E-posta ile Giriş
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              E-posta adresiniz ve şifrenizle giriş yapın.
            </p>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                  E-posta
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                    disabled={rateLimited}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={rateLimited}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              {!rateLimited && rateLimiter.remaining < 5 && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="size-3" />
                  Kalan deneme: {rateLimiter.remaining}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || !email || password.length < 6 || rateLimited}
              >
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 size-4" />
                )}
                Giriş Yap
              </Button>
            </form>
          </>
        )}

        {/* ─── Magic Link ──────────────────────────────────────────── */}
        {method === "magic" && !magicSent && (
          <>
            <h2 className="mb-1 text-lg font-semibold text-foreground">
              Sihirli Link
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              E-posta adresinize giriş linki gönderelim. Şifre gerekmez.
            </p>

            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label htmlFor="magic-email" className="mb-1.5 block text-sm font-medium text-foreground">
                  E-posta
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="magic-email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                    disabled={rateLimited}
                    autoComplete="email"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading || !magicEmail.includes("@") || rateLimited}
              >
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 size-4" />
                )}
                Link Gönder
              </Button>
            </form>
          </>
        )}

        {/* ─── Magic Link: Sent ────────────────────────────────────── */}
        {method === "magic" && magicSent && (
          <div className="text-center space-y-4 py-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="size-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Link Gönderildi!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{magicEmail}</span>{" "}
                adresine giriş linki gönderildi. E-postanızı kontrol edin ve linki tıklayın.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Link 1 saat geçerlidir. Spam klasörünü de kontrol edin.
            </p>
            <button
              type="button"
              onClick={() => {
                setMagicSent(false);
                setMagicEmail("");
                setError("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Farklı bir yöntem deneyin
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Giriş yaparak{" "}
        <span className="underline">kullanım koşullarını</span> kabul etmiş
        olursunuz.
      </p>
    </div>
  );
}
