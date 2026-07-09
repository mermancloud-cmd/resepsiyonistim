import Link from "next/link";
import { DEMO_WHATSAPP_NUMBER, DEMO_WHATSAPP_MESSAGE } from "@/lib/app-config";
import TestimonialsSection from "@/components/testimonials-section";
import { testimonials } from "@/lib/testimonials";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#f7f3ee] via-white to-[#f0ebe4]">
      {/* Schema.org Review structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Resepsiyonistim",
            description:
              "İşletmeniz için 7/24 WhatsApp tabanlı dijital resepsiyonist.",
            review: testimonials.map((t) => ({
              "@type": "Review",
              reviewRating: {
                "@type": "Rating",
                ratingValue: t.rating,
                bestRating: 5,
              },
              author: { "@type": "Person", name: t.name },
              reviewBody: t.quote,
            })),
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: (
                testimonials.reduce((s, t) => s + t.rating, 0) /
                testimonials.length
              ).toFixed(1),
              bestRating: 5,
              ratingCount: testimonials.length,
            },
          }),
        }}
      />

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full relative z-30">
        <div className="flex items-center gap-2.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-amber-200/50">
            R
          </div>
          <span
            className="font-semibold text-xl"
            style={{ fontFamily: "var(--font-heading)", color: "#1a2e2a" }}
          >
            Resepsiyonistim
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-teal-800/70 hover:text-teal-900 transition-colors px-3 py-2"
          >
            Giriş
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold bg-gradient-to-r from-teal-700 to-teal-600 text-white px-5 py-2.5 rounded-xl hover:from-teal-800 hover:to-teal-700 transition-all shadow-sm"
          >
            Ücretsiz Dene
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center relative overflow-hidden">
        {/* ── Arkaplan: dev bungalov + ağaç silueti ── */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          {/* Ana bungalov silueti */}
          <svg
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1000px] h-auto opacity-[0.055] md:opacity-[0.07]"
            viewBox="0 0 800 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: "blur(1px)" }}
          >
            {/* Zemin */}
            <rect x="0" y="500" width="800" height="100" fill="#1a2e2a" />
            {/* Bungalov — ana gövde */}
            <rect x="150" y="320" width="500" height="180" rx="4" fill="#1a2e2a" />
            {/* Bungalov — sağ uzantı */}
            <rect x="580" y="360" width="120" height="140" rx="3" fill="#1a2e2a" />
            {/* Çatı — ana */}
            <polygon points="100,320 400,180 700,320" fill="#1a2e2a" />
            {/* Çatı — uzantı */}
            <polygon points="580,360 640,260 700,360" fill="#1a2e2a" />
            {/* Baca */}
            <rect x="480" y="190" width="30" height="60" fill="#1a2e2a" />
            {/* Baca üst */}
            <rect x="475" y="185" width="40" height="8" rx="1" fill="#1a2e2a" />
            {/* Duman */}
            <circle cx="495" cy="170" r="8" fill="#1a2e2a" opacity="0.4" />
            <circle cx="505" cy="155" r="6" fill="#1a2e2a" opacity="0.3" />
            <circle cx="498" cy="140" r="5" fill="#1a2e2a" opacity="0.2" />
            {/* Kapı */}
            <rect x="360" y="410" width="60" height="90" rx="30" fill="#f7f3ee" opacity="0.15" />
            {/* Pencereler */}
            <rect x="200" y="370" width="50" height="50" rx="3" fill="#f7f3ee" opacity="0.12" />
            <rect x="270" y="370" width="50" height="50" rx="3" fill="#f7f3ee" opacity="0.12" />
            <rect x="460" y="370" width="50" height="50" rx="3" fill="#f7f3ee" opacity="0.12" />
            {/* Pencere çaprazları */}
            <line x1="225" y1="370" x2="225" y2="420" stroke="#f7f3ee" opacity="0.08" strokeWidth="1" />
            <line x1="200" y1="395" x2="250" y2="395" stroke="#f7f3ee" opacity="0.08" strokeWidth="1" />
            <line x1="295" y1="370" x2="295" y2="420" stroke="#f7f3ee" opacity="0.08" strokeWidth="1" />
            <line x1="270" y1="395" x2="320" y2="395" stroke="#f7f3ee" opacity="0.08" strokeWidth="1" />
            <line x1="485" y1="370" x2="485" y2="420" stroke="#f7f3ee" opacity="0.08" strokeWidth="1" />
            <line x1="460" y1="395" x2="510" y2="395" stroke="#f7f3ee" opacity="0.08" strokeWidth="1" />
            {/* Veranda */}
            <rect x="600" y="460" width="150" height="8" rx="2" fill="#1a2e2a" opacity="0.6" />
            <rect x="610" y="468" width="6" height="35" fill="#1a2e2a" opacity="0.5" />
            <rect x="660" y="468" width="6" height="35" fill="#1a2e2a" opacity="0.5" />
            <rect x="730" y="468" width="6" height="35" fill="#1a2e2a" opacity="0.5" />
            {/* Çam ağacı — solda */}
            <polygon points="80,420 100,320 120,420" fill="#1a2e2a" />
            <polygon points="75,370 100,280 125,370" fill="#1a2e2a" />
            <polygon points="70,310 100,220 130,310" fill="#1a2e2a" />
            <rect x="96" y="420" width="8" height="30" fill="#1a2e2a" />
            {/* Çam ağacı — sağda */}
            <polygon points="720,430 735,350 750,430" fill="#1a2e2a" />
            <polygon points="715,390 735,320 755,390" fill="#1a2e2a" />
            <polygon points="712,340 735,270 758,340" fill="#1a2e2a" />
            <rect x="731" y="430" width="8" height="25" fill="#1a2e2a" />
            {/* Yıldız / gece gökyüzü noktaları */}
            <circle cx="120" cy="80" r="2" fill="#1a2e2a" opacity="0.3" />
            <circle cx="300" cy="50" r="1.5" fill="#1a2e2a" opacity="0.25" />
            <circle cx="550" cy="70" r="2" fill="#1a2e2a" opacity="0.3" />
            <circle cx="680" cy="40" r="1.5" fill="#1a2e2a" opacity="0.2" />
            <circle cx="200" cy="120" r="1" fill="#1a2e2a" opacity="0.2" />
            <circle cx="450" cy="100" r="1.5" fill="#1a2e2a" opacity="0.25" />
            <circle cx="650" cy="110" r="1" fill="#1a2e2a" opacity="0.2" />
          </svg>
        </div>

        {/* Gradient ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 size-80 rounded-full bg-amber-300/15 blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 size-[28rem] rounded-full bg-teal-300/15 blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto space-y-9 relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur-sm border border-amber-200/50 px-4 py-1.5 text-xs font-medium text-amber-800 shadow-sm">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            İnsan Gibi Konuşan Dijital Resepsiyonist
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-[#1a2e2a] max-w-3xl mx-auto">
            İşletmenize{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400">
              Dijital Resepsiyonist
            </span>
            <br />
            Katılıyor
          </h1>

          <p className="text-base md:text-lg text-teal-800/70 max-w-xl mx-auto leading-relaxed">
            Bungalov, tiny house ve villa işletmeniz için 7/24 WhatsApp tabanlı
            resepsiyonist. Misafirlerinizle{" "}
            <strong className="text-teal-900 font-semibold">
              insan gibi konuşur
            </strong>
            , anında yanıtlar, rezervasyonları otomatik alır. Sen uyurken bile
            çalışır.
          </p>

          {/* Butonlar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
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
            </Link>

            {/* ═══ PREMIUM WHATSAPP BUTONU ═══ */}
            <a
              href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=${encodeURIComponent(DEMO_WHATSAPP_MESSAGE)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-3 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 text-white px-9 py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-300/40 hover:shadow-xl hover:shadow-emerald-300/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              {/* Animasyonlu ışıma katmanı */}
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out" />

              {/* Üst vurgu çizgisi */}
              <span className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              {/* WhatsApp ikonu */}
              <svg
                className="size-6 relative z-10"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>

              <span className="relative z-10">
                <span className="block text-sm font-normal opacity-80 leading-tight">
                  Hemen Dene
                </span>
                <span className="block text-lg leading-tight">
                  Canlı Gör &rarr;
                </span>
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
      </section>

      <TestimonialsSection />

      {/* Features */}
      <section className="px-6 py-20 md:py-28 bg-gradient-to-b from-white/80 via-white to-white/80 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1a2e2a]">
              Yapabilecekleri
            </h2>
            <p className="text-teal-800/60 mt-3 max-w-md mx-auto text-base">
              7/24 çalışır, insan gibi konuşur, sen uyurken bile misafirlerini
              ağırlar
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-teal-100/60 bg-white/60 backdrop-blur-sm p-7 space-y-4 hover:border-amber-200/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                {/* Cam efekti vurgu */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

                <div className="size-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-2xl shadow-sm border border-amber-200/40 relative z-10">
                  {f.icon}
                </div>
                <h3
                  className="font-semibold text-lg text-teal-900 relative z-10"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {f.title}
                </h3>
                <p className="text-sm text-teal-700/70 leading-relaxed relative z-10">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 md:py-28 bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 text-white text-center relative overflow-hidden">
        {/* Arkaplan deseni */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] size-[400px] rounded-full bg-amber-400/5 blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] size-[300px] rounded-full bg-white/5 blur-3xl" />
          {/* Grid deseni */}
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.03]"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        <div className="max-w-2xl mx-auto space-y-8 relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">
            Denemeye Hazır mısın?
          </h2>
          <p className="text-teal-100/80 text-base md:text-lg max-w-lg mx-auto">
            Şimdilik biz test aşamasındayız. Ama resepsiyonistinin nasıl
            konuştuğunu görmek için hemen dene.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-amber-500 text-amber-950 px-7 py-3.5 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 text-base hover:-translate-y-0.5"
            >
              Ücretsiz Dene
              <svg
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>

            {/* Alt CTA WhatsApp (daha sade) */}
            <a
              href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=${encodeURIComponent(DEMO_WHATSAPP_MESSAGE)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-white/10 text-white border border-white/20 px-6 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition-all hover:-translate-y-0.5"
            >
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
              </svg>
              Canlı Gör
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-[#1a2e2a] text-center">
        <p className="flex items-center justify-center gap-2.5 mb-3">
          <span className="size-6 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-xs">
            R
          </span>
          <span
            className="font-semibold text-teal-200 text-base"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Resepsiyonistim
          </span>
        </p>
        <p className="text-teal-400/50 text-xs">
          &copy; {new Date().getFullYear()} Resepsiyonistim. Tüm hakları
          saklıdır.
        </p>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: "💬",
    title: "İnsan Gibi Konuşma",
    desc: "Misafirleriniz WhatsApp'tan yazar, resepsiyonistiniz robot gibi değil insan gibi anlayarak yanıtlar.",
  },
  {
    icon: "📅",
    title: "Akıllı Rezervasyon",
    desc: "Gelen talepleri değerlendirir, müsaitlik kontrolü yapar ve rezervasyonu otomatik oluşturur.",
  },
  {
    icon: "🏠",
    title: "Tesis Bilgisi",
    desc: "Oda tipleri, fiyatlar ve konum bilgilerini anında paylaşır, her soruyu cevaplar.",
  },
  {
    icon: "🔄",
    title: "Akıllı Yönlendirme",
    desc: "Karmaşık taleplerde sizi haberdar eder, gerektiğinde konuşmayı size devreder.",
  },
  {
    icon: "📊",
    title: "Analitik Dashboard",
    desc: "Tüm konuşmalar, rezervasyonlar ve performans metrikleri tek ekranda seni bekler.",
  },
  {
    icon: "🔗",
    title: "Çoklu Tesis Desteği",
    desc: "Birden fazla tesisinizi tek panelden yönetin, her birine ayrı resepsiyonist atayın.",
  },
];
