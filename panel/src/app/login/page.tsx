"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
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
  Building2,
  UserPlus,
  RefreshCw,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { isValidPhone, isValidOTP, sanitizeOTP } from "@/lib/auth-utils";
import { useRateLimiter } from "@/hooks/use-rate-limiter";
import { toast } from "sonner";
import { APP_NAME, APP_TAGLINE } from "@/lib/app-config";

// ─── Types ────────────────────────────────────────────────────────────────────

type LoginMethod = "phone" | "email" | "magic";
type PhoneStep = "input" | "otp";

const METHOD_LABELS: Record<LoginMethod, string> = {
  phone: "Telefon",
  email: "E-posta",
  magic: "Sihirli Link",
};

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&";
  let pw = "";
  for (let i = 0; i < 20; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

// ─── Supabase error messages ──────────────────────────────────────────────────

function getSupabaseErrorMessage(error: any): string {
  if (!error) return "Bilinmeyen bir hata oluştu.";
  const msg =
    typeof error === "string"
      ? error
      : error.message || error.error_description || error.toString();

  if (msg.includes("User already registered"))
    return "Bu telefon numarası ile kayıtlı bir hesap zaten var.";
  if (msg.includes("Invalid login credentials"))
    return "E-posta veya şifre hatalı.";
  if (msg.includes("Email not confirmed"))
    return "E-posta adresiniz henüz doğrulanmamış. Lütfen e-postanızı kontrol edin.";
  if (msg.includes("invalid api key"))
    return "Sistem yapılandırma hatası. Lütfen daha sonra tekrar deneyin.";
  if (msg.includes("rate limit"))
    return "Çok fazla istek gönderdiniz. Lütfen bir süre bekleyin.";
  if (msg.includes("timeout") || msg.includes("network"))
    return "Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.";
  if (msg.includes("over_request") || msg.includes("over_email_send_rate"))
    return "Çok fazla doğrulama kodu gönderdiniz. Lütfen 1 saat bekleyin.";
  if (msg.includes("Invalid OTP"))
    return "Doğrulama kodu hatalı veya süresi dolmuş.";
  if (msg.includes("SMS") && msg.includes("disabled"))
    return "SMS doğrulaması şu an kullanılamıyor.";
  if (msg.includes("already") && msg.includes("exists"))
    return "Bu hesap zaten mevcut. Lütfen giriş yapın.";

  return msg;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [method, setMethod] = useState<LoginMethod>("phone");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("input");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Magic link state
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState(false);

  // Registration state
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPhoneFull, setRegisterPhoneFull] = useState("");
  const [businessName, setBusinessName] = useState("");

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rateLimited, setRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");

  // Rate limiter
  const rateLimiter = useRateLimiter({
    maxAttempts: 5,
    windowMs: 60_000,
    onLimited: () => {
      setRateLimited(true);
      setRetryAfter(60);
    },
  });

  // Show session expired message
  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "session_expired") {
      toast.info("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
    } else if (reason === "magic_link") {
      toast.success("E-posta adresinize sihirli link gönderildi!");
    }
  }, [searchParams]);

  useEffect(() => {
    setRateLimited(rateLimiter.isLimited);
    setRetryAfter(rateLimiter.retryAfter);
  }, [rateLimiter.isLimited, rateLimiter.retryAfter]);

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

  function clearErrors() {
    setError("");
    setFieldErrors({});
    setSuccessMessage("");
  }

  function setFieldError(field: string, message: string) {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }

  // ─── Phone OTP: Send Code ──────────────────────────────────────────────────

  async function handleSendOTP(e: FormEvent) {
    e.preventDefault();
    clearErrors();

    if (!rateLimiter.checkLimit()) return;

    const fullPhone = phone.startsWith("+") ? phone : `+90${phone.replace(/\D/g, "")}`;

    if (phone.replace(/\D/g, "").length < 10) {
      setFieldError("phone", "Lütfen geçerli bir telefon numarası girin.");
      return;
    }

    setLoading(true);
    try {
      const { error: supaError } = await auth.signInWithOtp(fullPhone);
      if (supaError) throw supaError;
      setPhoneStep("otp");
      setSuccessMessage(`+90 ${phone} numarasına doğrulama kodu gönderildi.`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setError(getSupabaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── Phone OTP: Verify Code ────────────────────────────────────────────────

  async function handleVerifyOTP(e: FormEvent) {
    e.preventDefault();
    clearErrors();

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
      toast.success("Giriş başarılı!");
      router.push("/dashboard");
    } catch (err) {
      setError(getSupabaseErrorMessage(err));
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  // ─── Email + Password ──────────────────────────────────────────────────────

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    clearErrors();

    if (!rateLimiter.checkLimit()) return;

    if (!email.includes("@") || !email.includes(".")) {
      setFieldError("email", "Geçerli bir e-posta adresi girin.");
      return;
    }
    if (password.length < 6) {
      setFieldError("password", "Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setLoading(true);
    try {
      const { error: supaError } = await auth.signInWithEmail(email, password);
      if (supaError) throw supaError;
      rateLimiter.reset();
      toast.success("Giriş başarılı!");
      router.push("/dashboard");
    } catch (err) {
      setError(getSupabaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── Magic Link ────────────────────────────────────────────────────────────

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    clearErrors();

    if (!rateLimiter.checkLimit()) return;

    if (!magicEmail.includes("@") || !magicEmail.includes(".")) {
      setFieldError("magicEmail", "Geçerli bir e-posta adresi girin.");
      return;
    }

    setLoading(true);
    try {
      const { error: supaError } = await auth.signInWithMagicLink(magicEmail);
      if (supaError) throw supaError;
      setMagicSent(true);
      rateLimiter.reset();
    } catch (err) {
      setError(getSupabaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── Register (phone + business name, no SMS required) ─────────────────────

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    clearErrors();

    const cleanPhone = registerPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setFieldError("registerPhone", "Geçerli bir telefon numarası girin.");
      return;
    }
    const name = businessName.trim();
    if (name.length < 2) {
      setFieldError(
        "businessName",
        "İşletme adı en az 2 karakter olmalıdır."
      );
      return;
    }
    if (name.length > 100) {
      setFieldError("businessName", "İşletme adı en fazla 100 karakter olabilir.");
      return;
    }

    setLoading(true);

    // Türkçe karakterleri normalize et (ç→c, ğ→g, etc.)
    const normalizedName = name
      .replace(/[çÇ]/g, "c")
      .replace(/[ğĞ]/g, "g")
      .replace(/[ıİ]/g, "i")
      .replace(/[öÖ]/g, "o")
      .replace(/[şŞ]/g, "s")
      .replace(/[üÜ]/g, "u");

    // Deterministic email: hash the phone to avoid collisions
    const phoneHash = cleanPhone.slice(-6); // use last 6 digits + random
    const salt = Math.random().toString(36).substring(2, 6);
    const autoEmail = `i${phoneHash}${salt}@auto.panel.merman.sbs`;
    const autoPw = generatePassword();

    try {
      // Use auth context's signUp which properly handles session propagation
      const { data, error: signUpError } = await auth.signUp(autoEmail, autoPw, {
        phone: `+90${cleanPhone}`,
        business_name: normalizedName,
        display_name: name,
      });

      if (signUpError) {
        if (
          signUpError.message?.toLowerCase().includes("already") ||
          signUpError.message?.toLowerCase().includes("exists")
        ) {
          setError("Bu telefon numarası ile kayıtlı bir hesap var. Lütfen giriş yapın.");
          return;
        }
        throw signUpError;
      }

      // If user was created, create tenant record
      if (data?.user) {
        setSuccessMessage("Kaydınız oluşturuluyor...");

        // Create tenant silently — uses fetch API directly
        createTenant(data.user.id, name, cleanPhone);

        // The auth context will auto-navigate on SIGNED_IN event
        if (data.session) {
          toast.success("Kayıt başarılı! Yönlendiriliyorsunuz...");
          // Auth context handles navigation
        } else {
          // Auto-confirm might be off — try sign in
          toast.info("Hesap oluşturuldu. Giriş yapılıyor...");
          try {
            const { error: signInError } = await auth.signInWithEmail(
              autoEmail,
              autoPw
            );
            if (signInError) throw signInError;
          } catch {
            // If sign-in fails, redirect to login with success msg
            setSuccessMessage(
              "Hesabınız oluşturuldu! Telefon doğrulaması ile giriş yapabilirsiniz."
            );
          }
        }
      } else {
        setError("Kayıt oluşturulamadı. Lütfen tekrar deneyin.");
      }
    } catch (err) {
      setError(getSupabaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── Create tenant via Supabase directly ──────────────────────────────────

  async function createTenant(
    userId: string,
    name: string,
    phone: string
  ): Promise<void> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      if (!supabaseUrl || !anonKey) return;

      // Use fetch with anon key — the session cookie is sent automatically
      await fetch(`${supabaseUrl}/rest/v1/tenants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          owner_id: userId,
          name: name.trim(),
          phone: `+90${phone}`,
          onboarding_completed: false,
        }),
        credentials: "include",
      });
    } catch {
      // Non-fatal — tenant can be created later during onboarding
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

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    if (pasted.length === 6) {
      // Auto-submit on full paste
      setTimeout(() => {
        const form = document.getElementById("otp-form") as HTMLFormElement;
        form?.requestSubmit();
      }, 100);
    }
  }

  // ─── Mode / Method Switching ──────────────────────────────────────────────

  const switchMethod = useCallback(
    (newMethod: LoginMethod) => {
      setMethod(newMethod);
      clearErrors();
      setPhoneStep("input");
      setMagicSent(false);
      setOtp(["", "", "", "", "", ""]);
    },
    []
  );

  const switchMode = useCallback(
    (newMode: "login" | "register") => {
      setMode(newMode);
      clearErrors();
      setPhoneStep("input");
      setOtp(["", "", "", "", "", ""]);
      setMagicSent(false);
      setShowRegisterPassword(false);
    },
    []
  );

  // ─── Render helpers ────────────────────────────────────────────────────────

  function renderInput(
    id: string,
    label: string,
    type: string,
    value: string,
    onChange: (v: string) => void,
    icon: React.ReactNode,
    opts: {
      placeholder?: string;
      autoFocus?: boolean;
      disabled?: boolean;
      autoComplete?: string;
      maxLength?: number;
      inputMode?: "text" | "numeric" | "tel" | "email";
      suffix?: React.ReactNode;
    } = {}
  ) {
    return (
      <div>
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          {label}
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            {icon}
          </div>
          <input
            id={id}
            type={type}
            inputMode={opts.inputMode}
            placeholder={opts.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              fieldErrors[id]
                ? "border-destructive focus:ring-destructive/50"
                : "border-border"
            )}
            autoFocus={opts.autoFocus}
            disabled={opts.disabled || loading || rateLimited}
            autoComplete={opts.autoComplete}
            maxLength={opts.maxLength}
          />
          {opts.suffix && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {opts.suffix}
            </div>
          )}
        </div>
        {fieldErrors[id] && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors[id]}</p>
        )}
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8">
      {/* Logo / Brand */}
      <div className="mb-6 text-center animate-in fade-in duration-500">
        <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
          <span className="text-2xl font-bold">P</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {APP_NAME}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{APP_TAGLINE}</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 flex w-full max-w-sm items-start gap-2.5 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-in slide-in-from-top-2 duration-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 flex w-full max-w-sm items-center gap-2.5 rounded-lg border border-emerald-500/50 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 animate-in slide-in-from-top-2 duration-200">
          <CheckCircle className="size-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Rate Limit Banner */}
      {rateLimited && (
        <div className="mb-4 flex w-full max-w-sm items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <Shield className="size-4 shrink-0" />
          <span>
            Çok fazla deneme. Lütfen {formatRetryAfter(retryAfter)} bekleyin.
          </span>
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        {/* Mode Switcher: Giriş Yap / Kayıt Ol */}
        <div className="mb-5 flex gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-200",
              mode === "login"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-200",
              mode === "register"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserPlus className="mr-1 inline size-3" />
            Kayıt Ol
          </button>
        </div>

        {/* ─── LOGIN MODE ──────────────────────────────────────────── */}
        {mode === "login" && (
          <div className="animate-in fade-in duration-300">
            {/* Method Tabs */}
            {phoneStep === "input" && !magicSent && (
              <div className="mb-5 flex gap-1 rounded-lg bg-muted p-1">
                {(Object.keys(METHOD_LABELS) as LoginMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMethod(m)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-200",
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

            {/* ─── Phone OTP: Input ──────────────────────────────── */}
            {method === "phone" && phoneStep === "input" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="mb-1 text-lg font-semibold text-foreground">
                  Telefon ile Giriş
                </h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  Telefon numaranıza doğrulama kodu gönderelim.
                </p>

                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
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
                          onChange={(e) =>
                            setPhone(
                              e.target.value.replace(/\D/g, "").slice(0, 10)
                            )
                          }
                          className={cn(
                            "h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground",
                            "transition-colors duration-150",
                            "focus:outline-none focus:ring-2 focus:ring-ring",
                            fieldErrors["phone"]
                              ? "border-destructive focus:ring-destructive/50"
                              : "border-border"
                          )}
                          autoFocus
                          disabled={loading || rateLimited}
                          maxLength={10}
                          autoComplete="tel-national"
                        />
                      </div>
                    </div>
                    {fieldErrors["phone"] && (
                      <p className="mt-1 text-xs text-destructive">
                        {fieldErrors["phone"]}
                      </p>
                    )}
                  </div>

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
                    disabled={
                      loading || phone.length < 10 || rateLimited
                    }
                  >
                    {loading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 size-4" />
                    )}
                    Kod Gönder
                  </Button>
                </form>
              </div>
            )}

            {/* ─── Phone OTP: Verify ─────────────────────────────── */}
            {method === "phone" && phoneStep === "otp" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneStep("input");
                      setOtp(["", "", "", "", "", ""]);
                      clearErrors();
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Geri"
                  >
                    <ArrowRight className="size-4 rotate-180" />
                  </button>
                  <h2 className="text-lg font-semibold text-foreground">
                    Doğrulama Kodu
                  </h2>
                </div>
                <p className="mb-6 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    0{phone}
                  </span>{" "}
                  numarasına gönderilen 6 haneli kodu girin.
                </p>

                <form
                  id="otp-form"
                  onSubmit={handleVerifyOTP}
                  className="space-y-4"
                >
                  <div
                    className="flex justify-center gap-2"
                    onPaste={handleOtpPaste}
                  >
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          otpRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={cn(
                          "flex size-11 items-center justify-center rounded-lg border bg-background text-center text-lg font-semibold text-foreground",
                          "transition-all duration-150",
                          "focus:outline-none focus:ring-2 focus:ring-ring focus:scale-105",
                          digit ? "border-primary" : "border-border"
                        )}
                        aria-label={`Kod hanesi ${i + 1}`}
                        disabled={rateLimited}
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={
                      loading || otp.join("").length < 6 || rateLimited
                    }
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
                      clearErrors();
                    }}
                    className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Numarayı değiştir
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={loading || rateLimited}
                    className="flex w-full items-center justify-center gap-1 text-center text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    <RefreshCw className="size-3" />
                    Kodu tekrar gönder
                  </button>
                </form>
              </div>
            )}

            {/* ─── Email + Password ──────────────────────────────── */}
            {method === "email" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="mb-1 text-lg font-semibold text-foreground">
                  E-posta ile Giriş
                </h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  E-posta adresiniz ve şifrenizle giriş yapın.
                </p>

                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
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
                        className={cn(
                          "h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground",
                          "transition-colors duration-150",
                          "focus:outline-none focus:ring-2 focus:ring-ring",
                          fieldErrors["email"]
                            ? "border-destructive focus:ring-destructive/50"
                            : "border-border"
                        )}
                        autoFocus
                        disabled={rateLimited}
                        autoComplete="email"
                      />
                    </div>
                    {fieldErrors["email"] && (
                      <p className="mt-1 text-xs text-destructive">
                        {fieldErrors["email"]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      Şifre
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={cn(
                          "h-10 w-full rounded-lg border bg-background pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground",
                          "transition-colors duration-150",
                          "focus:outline-none focus:ring-2 focus:ring-ring",
                          fieldErrors["password"]
                            ? "border-destructive focus:ring-destructive/50"
                            : "border-border"
                        )}
                        disabled={rateLimited}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                    {fieldErrors["password"] && (
                      <p className="mt-1 text-xs text-destructive">
                        {fieldErrors["password"]}
                      </p>
                    )}
                  </div>

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
                    disabled={
                      loading || !email || password.length < 6 || rateLimited
                    }
                  >
                    {loading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 size-4" />
                    )}
                    Giriş Yap
                  </Button>
                </form>
              </div>
            )}

            {/* ─── Magic Link ─────────────────────────────────────── */}
            {method === "magic" && !magicSent && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="mb-1 text-lg font-semibold text-foreground">
                  Sihirli Link
                </h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  E-posta adresinize giriş linki gönderelim. Şifre gerekmez.
                </p>

                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <label
                      htmlFor="magic-email"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
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
                        className={cn(
                          "h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground",
                          "transition-colors duration-150",
                          "focus:outline-none focus:ring-2 focus:ring-ring",
                          fieldErrors["magicEmail"]
                            ? "border-destructive focus:ring-destructive/50"
                            : "border-border"
                        )}
                        autoFocus
                        disabled={rateLimited}
                        autoComplete="email"
                      />
                    </div>
                    {fieldErrors["magicEmail"] && (
                      <p className="mt-1 text-xs text-destructive">
                        {fieldErrors["magicEmail"]}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={
                      loading || !magicEmail.includes("@") || rateLimited
                    }
                  >
                    {loading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 size-4" />
                    )}
                    Link Gönder
                  </Button>
                </form>
              </div>
            )}

            {/* ─── Magic Link: Sent ───────────────────────────────── */}
            {method === "magic" && magicSent && (
              <div className="animate-in fade-in duration-300 text-center space-y-4 py-4">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="size-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Link Gönderildi!
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {magicEmail}
                    </span>{" "}
                    adresine giriş linki gönderildi.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Link 1 saat geçerlidir. Spam klasörünü kontrol edin.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMagicSent(false);
                    setMagicEmail("");
                    clearErrors();
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Farklı bir yöntem deneyin
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── REGISTER MODE ─────────────────────────────────────────── */}
        {mode === "register" && (
          <div className="animate-in fade-in duration-300">
            <h2 className="mb-1 text-lg font-semibold text-foreground">
              Kayıt Ol
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Telefon numaranız ve işletme adınızla hemen kaydolun.
              <br />
              <span className="text-[11px] text-muted-foreground/70">
                SMS doğrulaması gerektirmez.
              </span>
            </p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label
                  htmlFor="reg-phone"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  Telefon Numarası
                </label>
                <div className="flex items-center gap-2">
                  <span className="flex h-10 items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground">
                    +90
                  </span>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="reg-phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="5XX XXX XX XX"
                      value={registerPhone}
                      onChange={(e) =>
                        setRegisterPhone(
                          e.target.value.replace(/\D/g, "").slice(0, 10)
                        )
                      }
                      className={cn(
                        "h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground",
                        "transition-colors duration-150",
                        "focus:outline-none focus:ring-2 focus:ring-ring",
                        fieldErrors["registerPhone"]
                          ? "border-destructive focus:ring-destructive/50"
                          : "border-border"
                      )}
                      autoFocus
                      disabled={loading}
                      maxLength={10}
                      autoComplete="tel-national"
                    />
                  </div>
                </div>
                {fieldErrors["registerPhone"] && (
                  <p className="mt-1 text-xs text-destructive">
                    {fieldErrors["registerPhone"]}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="business-name"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  İşletme Adı
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="business-name"
                    type="text"
                    placeholder="örn: Yeşil Vadi İşletmesi"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className={cn(
                      "h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground",
                      "transition-colors duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-ring",
                      fieldErrors["businessName"]
                        ? "border-destructive focus:ring-destructive/50"
                        : "border-border"
                    )}
                    disabled={loading}
                    autoComplete="organization"
                  />
                </div>
                {fieldErrors["businessName"] && (
                  <p className="mt-1 text-xs text-destructive">
                    {fieldErrors["businessName"]}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={
                  loading ||
                  registerPhone.length < 10 ||
                  businessName.trim().length < 2
                }
              >
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 size-4" />
                )}
                Kayıt Ol ve Giriş Yap
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-muted-foreground px-4 text-center">
        {mode === "login"
          ? "Giriş yaparak kullanım koşullarını kabul etmiş olursunuz."
          : "Kayıt olarak kullanım koşullarını kabul etmiş olursunuz."}
      </p>
    </div>
  );
}
