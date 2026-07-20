# Resepsiyonistim — Dijital Resepsiyonist

**İşletmenize 7/24 çalışan, insan gibi konuşan bir dijital resepsiyonist.**

Konaklama işletmeleri için WhatsApp tabanlı dijital resepsiyonist. Misafirlerle insan gibi konuşur, anında yanıtlar, rezervasyonları otomatik alır. AI asistanınızın adını siz belirlersiniz — işletmenize özel bir kimlik kazanır.

## 🏗️ Stack

- **Frontend:** Next.js 16 + React 19
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Auth:** Supabase SSR
- **Database:** Supabase (PostgreSQL)
- **Messaging:** Evolution API (WhatsApp)
- **Payments:** IBAN (şu anlık) → Iyzico (planlanan)
- **Orchestration:** n8n (WF02 — State+AI)
- **Deploy:** Static export → nginx → Coolify

## 🚀 Local Development

```bash
npm ci
cp .env.local.example .env.local  # fill in Supabase URL/ANON_KEY, VAPID key
npm run dev
```

## 🏗️ Production Build

```bash
npm run build
# Static export goes to out/
```

## 📦 Deploy

Static export served via nginx (see `nginx.conf`). Deployed on Coolify at `panel.merman.sbs`.

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push VAPID public key |

## 📁 Project Structure

```
src/
├── app/          # Next.js App Router pages
├── components/   # UI components (shadcn/ui)
├── hooks/        # React hooks
└── lib/          # Utilities, types, API clients
```

## 🧬 Brand

- Repo PRIVATE
- "AI" / "yapay zeka" → "dijital resepsiyonist" / "dijital asistan"
- Brand protection #1

## 📄 License

Private — Merman Cloud Inc.
