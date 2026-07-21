"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Loader2, AlertTriangle, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function getSupabaseErrorMessage(error: unknown): string {
  if (!error) return "Bilinmeyen bir hata oluştu.";
  const err = typeof error === "string" ? null : (error as Record<string, unknown>);
  const msg =
    typeof error === "string"
      ? error
      : typeof err?.message === "string"
        ? err.message
        : typeof err?.error_description === "string"
          ? err.error_description
          : String(error);

  if (msg.includes("Invalid login credentials")) return "E-posta veya şifre hatalı.";
  if (msg.includes("Email not confirmed")) return "E-posta adresiniz henüz doğrulanmamış. Lütfen e-postanızı kontrol edin.";
  if (msg.includes("rate limit")) return "Çok fazla istek gönderdiniz. Lütfen bir süre bekleyin.";
  if (msg.includes("timeout") || msg.includes("network")) return "Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.";

  return msg;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Show toast messages from URL params
  useState(() => {
    const reason = searchParams.get("reason");
    if (reason === "session_expired") {
      toast.info("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
    } else if (reason === "signed_up") {
      toast.success("Hesabınız oluşturuldu! E-postanızı doğrulayıp giriş yapın.");
    } else if (reason === "verified") {
      toast.success("E-posta adresiniz doğrulandı! Şimdi giriş yapabilirsiniz.");
    }
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.includes("@") || !email.includes(".")) {
      setError("Geçerli bir e-posta adresi girin.");
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
      toast.success("Giriş başarılı!");
      router.push("/dashboard");
    } catch (err) {
      setError(getSupabaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(provider: "google" | "apple") {
    setSocialLoading(provider);
    setError("");
    try {
      const redirectTo = `${window.location.origin}/api/auth/callback`;
      const { error: supaError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: provider === "google" ? {
            access_type: "offline",
            prompt: "consent",
          } : undefined,
        },
      });
      if (supaError) throw supaError;
    } catch (err) {
      setError(getSupabaseErrorMessage(err));
    } finally {
      setSocialLoading(null);
    }
  }

  async function handleMagicLink() {
    setError("");
    if (!email.includes("@")) {
      setError("Önce geçerli bir e-posta adresi girin.");
      return;
    }
    setSocialLoading("magic");
    try {
      const { error: supaError } = await auth.signInWithMagicLink(email);
      if (supaError) throw supaError;
      toast.success("E-posta adresinize giriş bağlantısı gönderdik!");
    } catch (err) {
      setError(getSupabaseErrorMessage(err));
    } finally {
      setSocialLoading(null);
    }
  }

  return (
    <div className="flex min-h-[100dvh]">
      {/* Left: Branding */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 p-12 text-white lg:flex">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -left-12 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <span className="font-heading text-2xl">R</span>
            </div>
            <span className="font-heading text-xl">Resepsiyonistim</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="font-heading text-3xl leading-tight">
            İşletmenize 'Dijital Resepsiyonist' katılıyor.
          </h2>
          <p className="max-w-md text-white/70">
            7/24 çalışan, insan gibi konuşan, rezervasyon alan, bilgi veren —
            müşterilerinizle doğal bir sohbet kuran dijital resepsiyonist.
          </p>
          <div className="flex gap-6 pt-4">
            <div>
              <div className="font-heading text-2xl">7/24</div>
              <div className="text-xs text-white/50">Kesintisiz</div>
            </div>
            <div>
              <div className="font-heading text-2xl">30 gün</div>
              <div className="text-xs text-white/50">Ücretsiz deneme</div>
            </div>
            <div>
              <div className="font-heading text-2xl">WhatsApp</div>
              <div className="text-xs text-white/50">Entegre</div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © 2026 Resepsiyonistim. Tüm hakları saklıdır.
        </p>
      </div>

      {/* Right: Form */}
      <div className="flex w-full items-center justify-center bg-neutral-50 px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 text-white">
                <span className="font-heading text-2xl">R</span>
              </div>
            </Link>
          </div>

          <h1 className="font-heading text-2xl text-neutral-900">Tekrar hoş geldin</h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            Hesabına giriş yap ve 'Dijital Resepsiyonist'ini yönet.
          </p>

          {/* Error Banner */}
          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
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

          {/* Social Login Buttons */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSocialLogin("google")}
              disabled={socialLoading !== null}
              className="flex items-center justify-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
            >
              {socialLoading === "google" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="size-4.5" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin("apple")}
              disabled={socialLoading !== null}
              className="flex items-center justify-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
            >
              {socialLoading === "apple" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="size-4.5" fill="currentColor">
                  <path d="M16.365 1.43c0 1.41-.84 2.76-2.13 3.74-1.29.97-2.94 1.35-4.57 1.17-.02-.49-.01-1.02.19-1.55.2-.53.56-1.06 1.03-1.47.47-.41 1.04-.7 1.69-.84.65-.14 1.31-.17 1.96-.04.21.55.51 1.07.92 1.49.41.42.92.73 1.48.9.14-.42.32-.82.53-1.19.22-.38.48-.72.78-1.02.3-.3.63-.55 1-.75.36-.2.74-.35 1.14-.44h-.02z"/>
                  <path d="M19.56 7.62c-.52.63-1.22 1.13-2.01 1.46.13.43.2.88.2 1.33 0 2.06-1.2 3.92-3.2 5.01-.75.41-1.57.7-2.43.86 2.04 1.27 4.51 1.7 6.72 1.15 1.1-.28 2.13-.78 3.02-1.48.89-.7 1.62-1.58 2.14-2.59.52-1.01.81-2.12.84-3.26.04-1.14-.17-2.27-.6-3.3-.43-1.03-1.06-1.96-1.84-2.72l-2.84 2.54z"/>
                </svg>
              )}
              Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 py-4">
            <span className="flex-1 border-t border-neutral-200" />
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              veya e-posta ile
            </span>
            <span className="flex-1 border-t border-neutral-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-neutral-700">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-neutral-700">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-9 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-neutral-500 cursor-pointer">
                <input type="checkbox" className="size-4 accent-neutral-900 rounded" />
                Beni hatırla
              </label>
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={socialLoading !== null}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline disabled:opacity-50"
              >
                {socialLoading === "magic" ? "Gönderiliyor..." : "E-posta ile giriş"}
              </button>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading || !email || password.length < 6}
              className="h-11 w-full bg-neutral-900 text-white hover:bg-neutral-800"
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 size-4" />
              )}
              Giriş Yap
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 space-y-3">
            <p className="text-center text-sm text-neutral-500">
              Hesabın yok mu?{" "}
              <Link href="/signup" className="font-medium text-teal-700 hover:underline">
                Ücretsiz dene
              </Link>
            </p>
            <p className="text-center text-xs text-neutral-400">
              Giriş yaparak{" "}
              <Link href="/terms.html" className="underline hover:text-neutral-700">kullanım koşulları</Link>
              'nı kabul etmiş olursunuz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
