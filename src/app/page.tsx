import Link from "next/link";
import { DEMO_WHATSAPP_NUMBER, DEMO_WHATSAPP_MESSAGE } from "@/lib/app-config";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-teal-50 via-white to-amber-50">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-base shadow-sm">R</div>
          <span className="font-semibold text-xl text-teal-900">Resepsiyonistim</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-teal-700 hover:text-teal-900 transition-colors px-3 py-2">Giriş</Link>
          <Link href="/signup" className="text-sm font-semibold bg-teal-700 text-white px-5 py-2.5 rounded-xl hover:bg-teal-800 transition-all shadow-sm">
            Ücretsiz Dene
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative overflow-hidden">
        {/* Arka plan efekti */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 size-72 rounded-full bg-amber-200/20 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 size-96 rounded-full bg-teal-200/20 blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-xs font-medium text-amber-800">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            İnsan Gibi Konuşan Dijital Resepsiyonist
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-teal-950">
            İşletmenize{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-500">
              Dijital Resepsiyonist
            </span>
            <br />
            Katılıyor
          </h1>

          <p className="text-lg text-teal-700/80 max-w-xl mx-auto leading-relaxed">
            Bungalov, tiny house ve villa işletmeniz için 7/24 WhatsApp tabanlı resepsiyonist.
            Misafirlerinizle <strong className="text-teal-900">insan gibi konuşur</strong>, anında yanıtlar,
            rezervasyonları otomatik alır. Sen uyurken bile çalışır.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-teal-700 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-teal-800 transition-all shadow-md text-base"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Ücretsiz Dene
            </Link>
            <a
              href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=${encodeURIComponent(DEMO_WHATSAPP_MESSAGE)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg hover:bg-emerald-700 hover:shadow-xl hover:-translate-y-0.5 transition-all text-base"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Canlı Dene
            </a>
          </div>
          <p className="text-xs text-teal-600/60 max-w-md mx-auto">
            Test işletmemiz <strong className="text-teal-700">Merman</strong> ile resepsiyonistin nasıl konuştuğunu canlı gör. Gerçek işletmeler için henüz test aşamasındayız.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-teal-950">Yapabilecekleri</h2>
            <p className="text-teal-700/70 mt-3 max-w-md mx-auto">
              7/24 çalışır, insan gibi konuşur, sen uyurken bile misafirlerini ağırlar
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-teal-100 bg-white p-7 space-y-4 hover:border-amber-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="size-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-2xl shadow-sm border border-amber-200/50">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg text-teal-900">{f.title}</h3>
                <p className="text-sm text-teal-700/70 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 bg-gradient-to-br from-teal-800 via-teal-700 to-teal-600 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 size-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 size-48 rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="max-w-xl mx-auto space-y-6 relative z-10">
          <h2 className="text-3xl font-bold">Denemeye Hazır mısın?</h2>
          <p className="text-teal-100/80 text-lg">
            Şimdilik biz test aşamasındayız. Ama resepsiyonistinin nasıl konuştuğunu görmek için hemen dene.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-amber-500 text-amber-950 px-7 py-3.5 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-lg text-base"
            >
              Ücretsiz Dene
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href={`https://wa.me/${DEMO_WHATSAPP_NUMBER}?text=${encodeURIComponent(DEMO_WHATSAPP_MESSAGE)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-6 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition-all"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
              </svg>
              Canlı Gör
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 bg-teal-950 text-center text-xs text-teal-400/60">
        <p className="flex items-center justify-center gap-2 mb-2">
          <span className="size-5 rounded-md bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-[10px]">R</span>
          <span className="font-semibold text-teal-300 text-sm">Resepsiyonistim</span>
        </p>
        <p>&copy; {new Date().getFullYear()} Resepsiyonistim. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}

const features = [
  { icon: "💬", title: "İnsan Gibi Konuşma", desc: "Misafirleriniz WhatsApp'tan yazar, resepsiyonistiniz robot gibi değil insan gibi anlayarak yanıtlar." },
  { icon: "📅", title: "Akıllı Rezervasyon", desc: "Gelen talepleri değerlendirir, müsaitlik kontrolü yapar ve rezervasyonu otomatik oluşturur." },
  { icon: "🏠", title: "Tesis Bilgisi", desc: "Oda tipleri, fiyatlar ve konum bilgilerini anında paylaşır, her soruyu cevaplar." },
  { icon: "🔄", title: "Akıllı Yönlendirme", desc: "Karmaşık taleplerde sizi haberdar eder, gerektiğinde konuşmayı size devreder." },
  { icon: "📊", title: "Analitik Dashboard", desc: "Tüm konuşmalar, rezervasyonlar ve performans metrikleri tek ekranda seni bekler." },
  { icon: "🔗", title: "Çoklu Tesis Desteği", desc: "Birden fazla tesisinizi tek panelden yönetin, her birine ayrı resepsiyonist atayın." },
];
