"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Loader2, CheckCircle, AlertTriangle, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Show session expired message
  useState(() => {
    const reason = searchParams.get("reason");
    if (reason === "session_expired") {
      toast.info("Oturumunuz sona erdi. Lütfen tekrar giriş yapın.");
    } else if (reason === "signed_up") {
      toast.success("Hesabınız oluşturuldu! E-postanızı doğrulayıp giriş yapın.");
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

  return (
    <div className="flex min-h-[100dvh]">
      {/* Left: Branding */}
      <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#0f766e] via-[#0c5d56] to-[#094d47] p-12 text-white lg:flex">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -left-12 h-96 w-96 rounded-full bg-[#f5a623]/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <span className="font-serif text-2xl">R</span>
            </div>
            <span className="font-serif text-xl">Resepsiyonistim</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="font-serif text-3xl leading-tight">
            İşletmenize dijital resepsiyonist katılıyor.
          </h2>
          <p className="max-w-md text-white/70">
            7/24 çalışan, insan gibi konuşan, rezervasyon alan, bilgi veren —
            müşterilerinizle doğal bir sohbet kuran dijital resepsiyonist.
          </p>
          <div className="flex gap-6 pt-4">
            <div>
              <div className="font-serif text-2xl">7/24</div>
              <div className="text-xs text-white/50">Kesintisiz</div>
            </div>
            <div>
              <div className="font-serif text-2xl">14 gün</div>
              <div className="text-xs text-white/50">Ücretsiz deneme</div>
            </div>
            <div>
              <div className="font-serif text-2xl">WhatsApp</div>
              <div className="text-xs text-white/50">Entegre</div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © 2026 Resepsiyonistim. Tüm hakları saklıdır.
        </p>
      </div>

      {/* Right: Form */}
      <div className="flex w-1/2 items-center justify-center bg-[#faf9f6] px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f766e] to-[#0c5d56] text-white">
                <span className="font-serif text-2xl">R</span>
              </div>
            </Link>
          </div>

          <h1 className="font-serif text-2xl text-[#1a2f2d]">Tekrar hoş geldin</h1>
          <p className="mt-1.5 text-sm text-[#6b7f7d]">
            Hesabına giriş yap ve dijital resepsiyonistini yönet.
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#1a2f2d]">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aaca9]" />
                <input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[#e0ddd5] bg-white pl-9 pr-3 text-sm text-[#1a2f2d] placeholder:text-[#9aaca9] transition-colors duration-150 focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20"
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#1a2f2d]">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aaca9]" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[#e0ddd5] bg-white pl-9 pr-9 text-sm text-[#1a2f2d] placeholder:text-[#9aaca9] transition-colors duration-150 focus:border-[#0f766e] focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aaca9] hover:text-[#1a2f2d]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading || !email || password.length < 6}
              className="h-11 w-full bg-[#0f766e] hover:bg-[#0c5d56]"
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
            <p className="text-center text-sm text-[#6b7f7d]">
              Hesabın yok mu?{" "}
              <Link href="/signup" className="font-medium text-[#0f766e] hover:underline">
                Ücretsiz dene
              </Link>
            </p>
            <p className="text-center text-xs text-[#9aaca9]">
              Giriş yaparak kullanım koşullarını kabul etmiş olursunuz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}