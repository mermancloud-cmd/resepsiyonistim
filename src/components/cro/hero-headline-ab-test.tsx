"use client";

import * as React from "react";

const HEADLINES = [
  {
    id: "current",
    label: "Mevcut",
    primary: "İşletmenize Dijital Resepsiyonist Katılıyor",
    secondary: "Bungalov, tiny house ve villa işletmeniz için 7/24 WhatsApp tabanlı resepsiyonist.",
  },
  {
    id: "benefit",
    label: "Fayda Odaklı",
    primary: "Sen Uyurken Bile Misafirlerini Karşıla",
    secondary: "7/24 WhatsApp resepsiyonistin ile hiçbir talep kaçmaz. Rezervasyonları otomatik al, işine odaklan.",
  },
  {
    id: "social-proof",
    label: "Sosyal Kanıt",
    primary: "24+ İşletme Dijital Resepsiyoniste Geçti",
    secondary: "Sırada bekleyen misafir yok, kaçan müşteri yok. 7/24 çalışan AI resepsiyonist ile tanışın.",
  },
  {
    id: "question",
    label: "Soru Odaklı",
    primary: "Hâlâ Telefonla mı Uğraşıyorsun?",
    secondary: "Misafirlerin WhatsApp'tan yazıyor, AI resepsiyonist anında yanıtlıyor. Sen işine bak.",
  },
];

interface ABTestHeadlineProps {
  /** The test variant id to render. Stored in a cookie for A/B testing. */
  variantId?: string;
  /** Callback when user clicks the primary CTA inside any headline variant. */
  onCTAClick?: () => void;
}

const COOKIE_NAME = "hero-headline-variant";

function getVariantFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setVariantCookie(variantId: string) {
  // Set for 90 days, same path, no httpOnly so JS can read
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    variantId
  )}; path=/; max-age=${90 * 86400}; SameSite=Lax`;
}

/**
 * Selects a random variant on first visit (sticky via cookie).
 * If forced via props, uses that instead.
 */
function useHeadlineVariant(forcedVariantId?: string) {
  const [variant, setVariant] = React.useState<string>(HEADLINES[0].id);

  React.useEffect(() => {
    if (forcedVariantId) {
      setVariant(forcedVariantId);
      setVariantCookie(forcedVariantId);
      return;
    }

    const existing = getVariantFromCookie();
    if (existing && HEADLINES.find((h) => h.id === existing)) {
      setVariant(existing);
      return;
    }

    // Random assignment
    const randomIndex = Math.floor(Math.random() * HEADLINES.length);
    const selected = HEADLINES[randomIndex].id;
    setVariant(selected);
    setVariantCookie(selected);
  }, [forcedVariantId]);

  return variant;
}

interface HeroHeadlineProps {
  forcedVariant?: string;
}

/**
 * A/B testable hero headline section.
 * - Assigns a random variant on first visit (sticky cookie)
 * - Wraps the original hero CTA buttons
 */
export default function HeroHeadlineABTest({
  forcedVariant,
}: HeroHeadlineProps) {
  const variantId = useHeadlineVariant(forcedVariant);
  const headline = HEADLINES.find((h) => h.id === variantId) ?? HEADLINES[0];

  return (
    <>
      {/* Hidden debug info — only visible in dev */}
      <span className="hidden text-[10px] text-muted-foreground">
        Variant: {headline.label}
      </span>

      <div className="max-w-4xl mx-auto space-y-9 relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-sm border border-amber-200/50 px-4 py-1.5 text-xs font-medium text-amber-800 shadow-sm">
          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
          İnsan Gibi Konuşan Dijital Resepsiyonist
        </div>

        {/* Heading — variant dependent */}
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-[#1a2e2a] max-w-3xl mx-auto">
          {headline.id === "current" ? (
            <>
              İşletmenize{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400">
                Dijital Resepsiyonist
              </span>
              <br />
              Katılıyor
            </>
          ) : headline.id === "benefit" ? (
            <>
              Sen Uyurken Bile{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400">
                Misafirlerini Karşıla
              </span>
            </>
          ) : headline.id === "social-proof" ? (
            <>
              24+ İşletme{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400">
                Dijital Resepsiyoniste
              </span>
              <br />
              Geçti
            </>
          ) : (
            <>
              Hâlâ{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400">
                Telefonla mı
              </span>
              <br />
              Uğraşıyorsun?
            </>
          )}
        </h1>

        <p className="text-base md:text-lg text-teal-800/70 max-w-xl mx-auto leading-relaxed">
          {headline.secondary}
        </p>

        {/* Buttons — same for all variants */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/signup"
            className="inline-flex items-center gap-2 bg-teal-800 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-teal-900 transition-all shadow-md text-base hover:-translate-y-0.5 hover:shadow-lg"
          >
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            Ücretsiz Dene
          </a>

          <a
            href={`https://wa.me/905427450654?text=Merhaba`}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-3 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white px-9 py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-300/40 hover:shadow-xl hover:shadow-emerald-300/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out" />
            <span className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <svg className="size-6 relative z-10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
            </svg>
            <span className="relative z-10">
              <span className="block text-sm font-normal opacity-80 leading-tight">Hemen Dene</span>
              <span className="block text-lg leading-tight">Canlı Gör &rarr;</span>
            </span>
          </a>
        </div>

        <p className="text-xs text-teal-700/50 max-w-md mx-auto">
          Test işletmemiz{" "}
          <strong className="text-teal-800 font-medium">Merman</strong> ile
          resepsiyonistin nasıl konuştuğunu canlı gör. Gerçek işletmeler için
          henüz test aşamasındayız.
        </p>
      </div>
    </>
  );
}
