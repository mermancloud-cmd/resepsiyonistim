/**
 * Seed testimonials for social proof section.
 * All entries are fictional but representative of real customer profiles.
 */
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  business: string;
  avatar: string; // emoji fallback for MVP
  quote: string;
  rating: number; // 1–5
}

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Ayşe Yılmaz",
    role: "İşletme Sahibi",
    business: "Merman Bungalov",
    avatar: "👩‍💼",
    quote:
      "Misafirlerim gece 2'de bile yazıyor, resepsiyonistim anında cevaplıyor. Sabah kalktığımda rezervasyon hazır oluyor. İnanılmaz bir rahatlık.",
    rating: 5,
  },
  {
    id: "t2",
    name: "Mehmet Kaya",
    role: "Otel Müdürü",
    business: "Kaya Tiny House",
    avatar: "👨‍💼",
    quote:
      "Telefonla uğraşmak yerine her şey WhatsApp'tan hallediliyor. Misafirler çok memnun, biz işimize odaklanıyoruz.",
    rating: 5,
  },
  {
    id: "t3",
    name: "Zeynep Demir",
    role: "Butik Otel Sahibi",
    business: "Demir Butik Otel",
    avatar: "👩‍💻",
    quote:
      "İlk başta robot gibi cevaplar vereceğini düşünmüştüm ama gerçekten insan gibi konuşuyor. Misafirler fark etmiyor bile.",
    rating: 5,
  },
  {
    id: "t4",
    name: "Ali Öztürk",
    role: "Villa İşletmecisi",
    business: "Villam Senin",
    avatar: "👨‍🌾",
    quote:
      "Sezonda günde 40-50 mesaj geliyordu. Şimdi hepsini resepsiyonist karşılıyor. Kaçan müşteri sayımız yarı yarıya düştü.",
    rating: 4,
  },
  {
    id: "t5",
    name: "Elif Acar",
    role: "Glamping İşletmecisi",
    business: "Acar Glamping",
    avatar: "👩‍🌾",
    quote:
      "Kamp alanımız dağ başında, internet bile zaman zaman gidiyor. Ama resepsiyonist çalışmaya devam ediyor. Harika bir sistem.",
    rating: 5,
  },
];
