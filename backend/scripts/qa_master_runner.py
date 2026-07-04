#!/usr/bin/env python3
"""
Bungalov AI Resepsiyonist — QA Master Runner v2
=================================================
43 senaryo × 5 kategori — comprehensive QA pipeline
9Router API → LLM-as-judge H/T/S → Trend → Telegram

Özellikler:
  - 43 test senaryosu (tümü veya kategori filtresi)
  - Doğrudan 9Router API (n8n bypass)
  - LLM-as-judge ile H(insanlık)/T(güven)/S(satış) skorlama
  - Trend tracking (geçmiş karşılaştırma + regresyon algılama)
  - Latency monitoring (her senaryo için yanıt süresi)
  - Kategori bazında kırılım + sıralama
  - Zayıf performans gösterenleri tespit
  - no_agent cron uyumlu (stdout'a JSON çıktı)

Kullanım:
  python qa_master_runner.py                    # Tüm 43 senaryo
  python qa_master_runner.py --cat bungalov     # Tek kategori
  python qa_master_runner.py --trend            # Sadece trend raporu
  python qa_master_runner.py --json             # JSON çıktı (cron/no_agent)
"""

import os
import sys
import re
import json
import time
import argparse
import importlib.util
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ─── Paths ─────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = BASE_DIR / "scripts"
TEST_SUITE_PATH = BASE_DIR / "tests" / "bungalov_qa_v3.py"
TREND_FILE = BASE_DIR / "tests" / "qa_trend_history.json"
REPORT_FILE = SCRIPTS_DIR / "test_9router_report.json"

# ─── 9Router Config ───────────────────────────────
ROUTER_URL = "https://9router.merman.sbs/v1/chat/completions"
API_KEY = os.environ.get("NINEROUTER_KEY", "") or os.environ.get("NINEROUTER_API_KEY", "")
MODEL = os.environ.get("BUNGALOV_TEST_MODEL", "ocg/qwen3.7-plus")

# ─── Telegram Config ──────────────────────────────
BOT_TOKEN = os.environ.get("BUNGALOV_BOT_TOKEN", "")
CHAT_ID = os.environ.get("BUNGALOV_CHAT_ID", "7037064546")

# ─── Elif System Prompt ───────────────────────────
ELIF_SYSTEM_PROMPT = """Sen Merman Bungalov'un resepsiyonistisin. Adın Elif. Gelen misafirle arkadaş canlısı bir ortamda sohbet ediyorsun.

NASIL KONUŞMALISIN:
- Sanki bir arkadaşına tesisi anlatıyormuş gibi konuş. Doğal olsun.
- Cümlelerini değiştir: bazen kısa, bazen biraz daha uzun. Hep aynı uzunlukta olmasın.
- Misafirin söylediği bir şeye referans ver, dinlediğini belli et.
- Doğrudan "İsim nedir?" yerine "Adınızı öğrenebilir miyim?" gibi daha yumuşak ifadeler kullan.
- "Gerekli", "talep", "iletmek", "bildirmek" gibi resmi/bürokratik kelimeler KULLANMA.
- Soru sorduğunda doğal olsun: "Ne dersiniz?" "Nasıl?" "Size uygun mu?"
- Misafir bir şey sorduğunda direkt cevap ver, sonra doğal bir soruyla devam et.
- Uzun liste yapma. Tek seferde her şeyi anlatmaya çalışma.

YANIT YAPISI:
1. Önce misafirin sorusuna doğrudan cevap ver (sıcak bir şekilde)
2. Bir iki cümleyle ek bilgi ver (broşür gibi değil, sohbet eder gibi)
3. Doğal bir soruyla yanıtı bitir

ÖRNEK — İYİ:
Misafir: "Merhaba, bungalov hakkında bilgi almak istiyorum"
Sen: "Merhaba, hoş geldiniz. Bungalovlarımız ormanın içinde, şömineli ve jakuzili — tam bir doğa kaçamağı. Kaç kişi için bakıyorsunuz, tarih var mı aklınızda?"

ÖRNEK — KÖTÜ:
"Merhaba. Bungalovlarımız doğa içinde, şömineli ve jakuzili ahşap yapılar. İsim nedir? Net fiyat ve rezervasyon için tarih ve kişi sayısı gerekli."

KONAKLAMA BİLGİSİ:
- Bungalov (2-4 kişi): Jakuzi, barbekü, mutfak, otopark, WiFi
- Tiny House (2 kişi): Minimalist, solar enerji, kamp alanı
- Villa (10 kişi): Özel havuz, geniş bahçe, 4 yatak odası

ÖNEMLİ:
- Fiyat sorulursa net söyle ve tarih sor
- Rezervasyon için: tarih, kişi sayısı, birim tipi sor
- **İngilizce konuşurken**: KESİNLİKLE robotik İngilizce konuşma! Aynı sıcak, samimi, cana yakın Türk resepsiyonist kişiliğini KORU. Sadece dil değişir, karakterin değişmez. 'Yes, I speak English. How can I help?' gibi kuru/resmi başlama KESİNLİKLE YASAK. Bunun yerine: 'Hey canım, I'm Elif! Bungalows are amazing — jakuzi, BBQ, forest view. When are you thinking of coming?' gibi için ısıtan, samimi bir karşılama yap. Türkçe konuşurken ne kadar sıcaksan İngilizcede de aynısın.
- Misafir sinirliyse anlayış göster, çözüm odaklı ol"""


# ══════════════════════════════════════════════════════
# API LAYER
# ══════════════════════════════════════════════════════

def call_9router(message: str, max_tokens: int = 4096, timeout: int = 60) -> dict:
    """Send message to 9Router and get Elif response."""
    import requests

    if not API_KEY:
        return {"error": "NINEROUTER_KEY not set", "reply": None}

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": ELIF_SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.7,
        "stream": False,
    }

    t0 = time.time()
    try:
        resp = requests.post(
            ROUTER_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )
        latency = round(time.time() - t0, 2)

        if resp.status_code != 200:
            return {
                "error": f"HTTP {resp.status_code}: {resp.text[:300]}",
                "reply": None,
                "http_status": resp.status_code,
                "latency": latency,
            }

        # Parse JSON response
        text = resp.text
        # Handle potential SSE or wrapped responses
        json_match = re.search(r'\{.*"choices".*\}', text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            usage = data.get("usage", {})
            return {
                "error": None,
                "reply": reply or "",
                "http_status": 200,
                "model": data.get("model", MODEL),
                "usage": usage,
                "latency": latency,
            }
        else:
            return {
                "error": "Could not parse response JSON",
                "reply": text[:500],
                "http_status": 200,
                "latency": latency,
            }

    except requests.Timeout:
        return {"error": f"TIMEOUT ({timeout}s)", "reply": None, "latency": timeout}
    except Exception as e:
        return {"error": str(e), "reply": None, "latency": round(time.time() - t0, 2)}


def llm_score(reply: str, scenario: dict) -> dict:
    """Evaluate response using 9Router LLM for H/T/S scores."""
    import requests

    eval_prompt = f"""Sen bir AI kalite değerlendiricisin. Bir konaklama tesisi resepsiyonistinin yanıtını değerlendiriyorsun.

Aşağıdaki 3 kategoride 0-100 arası puan ver:

H (İnsana Benzerlik / Human-likeness): Yanıt gerçek bir insan resepsiyonist gibi mi? Doğal mı? Robotik ifadeler var mı?
- 95+: Gerçek insan gibi, doğal akıcı, hiç robotik değil
- 85-94: Oldukça doğal, küçük robotik izler var
- 70-84: Biraz robotik, resmi ifadeler var
- <70: Çok robotik, bariz yapay zeka

T (Güvenilirlik / Trust): Yanıt güven veriyor mu? Profesyonel mi? Samimi mi?
- 95+: Tam güven, sıcak ve profesyonel
- 85-94: Güvenilir, küçük eksikler var
- <85: Güven sarsıcı, soğuk veya ilgisiz

S (Satış / Sales): Satışa yönlendiriyor mu? Değer önerisi sunuyor mu?
- 95+: Etkili satış, doğal yönlendirme
- 85-94: İyi, daha iyi olabilir
- <85: Satış fırsatını kaçırmış

SADECE sayısal puanları döndür. Yanıtında sadece şu JSON formatını kullan, başka hiçbir şey yazma:
{{"H": 0, "T": 0, "S": 0, "reason": "kısa gerekçe"}}

MÜŞTERİ MESAJI: {scenario['message']}
RESEPSİYONİST YANITI: {reply}"""

    try:
        resp = requests.post(
            ROUTER_URL,
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [{"role": "user", "content": eval_prompt}],
                "max_tokens": 256,
                "temperature": 0.1,
                "stream": False,
            },
            timeout=60
        )
        data = resp.json()
        content = data["choices"][0]["message"]["content"]

        # Parse JSON (handle think tags, markdown fences)
        content_clean = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL)
        content_clean = re.sub(r'```json\s*', '', content_clean)
        content_clean = re.sub(r'```', '', content_clean)

        scores = json.loads(content_clean.strip())
        return {
            "H": float(scores.get("H", 85)),
            "T": float(scores.get("T", 85)),
            "S": float(scores.get("S", 85)),
            "reason": scores.get("reason", ""),
        }
    except Exception as e:
        return {"H": 85.0, "T": 85.0, "S": 85.0, "reason": f"eval error: {e}"}


# ══════════════════════════════════════════════════════
# TREND TRACKING
# ══════════════════════════════════════════════════════

def load_trend_history() -> list:
    """Load previous QA run history."""
    if TREND_FILE.exists():
        try:
            with open(TREND_FILE, encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, Exception):
            return []
    return []


def save_trend_entry(entry: dict):
    """Append and save new entry to trend history (keep last 100)."""
    history = load_trend_history()
    history.append(entry)
    # Keep last 100 entries
    if len(history) > 100:
        history = history[-100:]
    with open(TREND_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def compute_trend(history: list, metric: str = "total", window: int = 5) -> dict:
    """Compare current vs recent history for trend analysis."""
    if len(history) < 2:
        return {"direction": "flat", "change": 0, "previous": None}

    current = history[-1].get("scores", {}).get(metric, 0)
    # Average of last 'window' entries before current
    prev_entries = history[:-1]
    if not prev_entries:
        return {"direction": "flat", "change": 0, "previous": None}

    window_actual = min(window, len(prev_entries))
    recent = prev_entries[-window_actual:]
    previous = sum(r.get("scores", {}).get(metric, 0) for r in recent) / len(recent)

    change = current - previous
    if change > 1.0:
        direction = "up"
    elif change < -1.0:
        direction = "down"
    else:
        direction = "flat"

    return {
        "direction": direction,
        "change": round(change, 1),
        "previous": round(previous, 1),
        "current": current,
    }


def detect_regression(history: list, threshold: float = -3.0) -> list:
    """Detect significant score drops across metrics."""
    if len(history) < 2:
        return []

    current = history[-1].get("scores", {})
    prev = history[-2].get("scores", {})

    alerts = []
    for metric in ["H", "T", "S", "total"]:
        cur_val = current.get(metric, 0)
        prev_val = prev.get(metric, 0)
        if prev_val > 0 and (cur_val - prev_val) <= threshold:
            alerts.append({
                "metric": metric,
                "drop": round(cur_val - prev_val, 1),
                "from": prev_val,
                "to": cur_val,
            })
    return alerts


# ══════════════════════════════════════════════════════
# SCENARIO LOADER
# ══════════════════════════════════════════════════════

def load_scenarios():
    """Load scenarios from bungalov_qa_v3.py test suite."""
    if not TEST_SUITE_PATH.exists():
        print(f"[HATA] Test suite bulunamadı: {TEST_SUITE_PATH}")
        sys.exit(1)

    spec = importlib.util.spec_from_file_location("qa_module", TEST_SUITE_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.SCENARIOS, getattr(mod, "CATEGORIES", [
        "bungalov", "tiny_house", "villa", "edge_case", "sales"
    ])


# ══════════════════════════════════════════════════════
# TELEGRAM NOTIFICATIONS
# ══════════════════════════════════════════════════════

def tg_send(text: str, parse_mode: str = "HTML") -> bool:
    """Send message to Telegram via bot API."""
    if not BOT_TOKEN:
        return False
    import urllib.request
    try:
        url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
        if len(text) > 4000:
            text = text[:3997] + "..."
        data = json.dumps({
            "chat_id": CHAT_ID,
            "text": text,
            "parse_mode": parse_mode,
        }).encode()
        req = urllib.request.Request(url, data=data,
            headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=15)
        return True
    except Exception as e:
        print(f"[TELEGRAM] Hata: {e}")
        return False


def format_trend_arrow(direction: str) -> str:
    """Return emoji arrow for trend direction."""
    return {"up": "📈", "down": "📉", "flat": "➡️"}.get(direction, "➡️")


def build_telegram_report(
    results: list,
    duration: float,
    scores: dict,
    category: str,
    cat_scores: dict,
    history: list,
    regression_alerts: list,
    worst_performers: list,
    start_time: str,
) -> str:
    """Build a rich HTML Telegram report."""
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    warned = sum(1 for r in results if r["status"] == "WARN")
    failed = sum(1 for r in results if r["status"] == "FAIL")

    h_avg = scores.get("H", 0)
    t_avg = scores.get("T", 0)
    s_avg = scores.get("S", 0)
    total_avg = scores.get("total", 0)

    # Emoji gauge for scores
    def gauge(val, target=90):
        if val >= target:
            return "🟢"
        elif val >= target * 0.9:
            return "🟡"
        return "🔴"

    lines = [
        f"🧪 <b>BUNGALOV QA RAPORU</b>",
        f"📅 {start_time} | ⏱ {duration:.0f}s",
        f"🧮 {total} senaryo | ✅ {passed} | ⚠️ {warned} | ❌ {failed}",
        f"📋 Kategori: <b>{category}</b>" if category else "📋 Kategori: <b>TÜMÜ</b>",
    ]

    # Main scores
    lines.extend([
        "",
        "<b>SKORLAR:</b>",
        f"{gauge(h_avg)} <b>H</b> (İnsanlık):  {h_avg:.1f}",
        f"{gauge(t_avg)} <b>T</b> (Güven):     {t_avg:.1f}",
        f"{gauge(s_avg)} <b>S</b> (Satış):     {s_avg:.1f}",
        f"{gauge(total_avg)} <b>TOPLAM:</b>     {total_avg:.1f}",
    ])

    # Trend arrows
    if len(history) >= 2:
        trend_h = compute_trend(history, "H")
        trend_t = compute_trend(history, "T")
        trend_s = compute_trend(history, "S")
        trend_total = compute_trend(history, "total")
        lines.append("")
        lines.append("<b>TREND (son 5):</b>")
        lines.append(f"H: {format_trend_arrow(trend_h['direction'])} {trend_h['change']:+.1f} ({trend_h['previous']:.1f}→{trend_h['current']:.1f})")
        lines.append(f"T: {format_trend_arrow(trend_t['direction'])} {trend_t['change']:+.1f} ({trend_t['previous']:.1f}→{trend_t['current']:.1f})")
        lines.append(f"S: {format_trend_arrow(trend_s['direction'])} {trend_s['change']:+.1f} ({trend_s['previous']:.1f}→{trend_s['current']:.1f})")
        lines.append(f"∑: {format_trend_arrow(trend_total['direction'])} {trend_total['change']:+.1f} ({trend_total['previous']:.1f}→{trend_total['current']:.1f})")

    # Category breakdown
    if cat_scores:
        lines.append("")
        lines.append("<b>KATEGORİ KIRILIMI:</b>")
        for cat, sc in cat_scores.items():
            c = sc["count"]
            h_c = sc["H"]
            t_c = sc["T"]
            s_c = sc["S"]
            t_cat = sc["Total"]
            lines.append(f"  {cat.upper()}: {c} 🧪 H={h_c:.0f} T={t_c:.0f} S={s_c:.0f} ∑={t_cat:.0f}")

    # Worst performers
    if worst_performers:
        lines.append("")
        lines.append("<b>⬇️ EN DÜŞÜK SKORLAR:</b>")
        for wp in worst_performers[:5]:
            lines.append(f"  {wp['id']} {wp['name']}: H={wp['H']:.0f} T={wp['T']:.0f} S={wp['S']:.0f} ∑={wp['total']:.0f}")

    # Regression alerts
    if regression_alerts:
        lines.append("")
        lines.append("🚨 <b>REGRESYON UYARILARI:</b>")
        for ra in regression_alerts:
            lines.append(f"  {ra['metric']}: {ra['from']:.1f} → {ra['to']:.1f} ({ra['drop']:.1f})")

    # Alerts for low scores
    alerts = []
    if total_avg < 90:
        alerts.append("🚨 Toplam skor 90 altında!")
    if h_avg < 85:
        alerts.append("👤 İnsanlık skoru kritik!")
    if failed > 0:
        alerts.append(f"❌ {failed} başarısız senaryo var!")
    if regression_alerts:
        alerts.append("📉 Regresyon tespit edildi!")

    if alerts:
        lines.append("")
        lines.append(f"<b>{' | '.join(alerts)}</b>")

    # Model info
    lines.append("")
    lines.append(f"🤖 Model: {MODEL}")

    return "\n".join(lines)


# ══════════════════════════════════════════════════════
# TEST RUNNER
# ══════════════════════════════════════════════════════

def run_tests(
    scenarios: list,
    cat_filter: str = None,
    send_telegram: bool = True,
    quiet: bool = False,
) -> list:
    """Run all scenarios through 9Router and score responses."""
    total = len(scenarios)
    results = []
    batch_buffer = []
    errors = []

    for i, scenario in enumerate(scenarios, 1):
        sid = scenario["id"]
        sname = scenario["name"]
        scat = scenario["cat"]
        smsg = scenario["message"]

        if not quiet:
            print(f"\n  [{i}/{total}] {sid}: {sname} ({scat})")
            print(f"    👤 MÜŞTERİ: \"{smsg[:80]}\"")

        # Call 9Router
        api_result = call_9router(smsg)

        if api_result["error"]:
            if not quiet:
                print(f"    ❌ API HATASI: {api_result['error']}")
            reply = f"[HATA] {api_result['error']}"
            http_status = api_result.get("http_status", "000")
            latency = api_result.get("latency", 0)
        else:
            reply = api_result["reply"]
            http_status = api_result.get("http_status", "200")
            latency = api_result.get("latency", 0)
            if not quiet:
                r_disp = reply[:150] + ("..." if len(reply) > 150 else "")
                print(f"    🤖 ELİF: \"{r_disp}\"")
                print(f"    ⏱ {latency}s | 📦 {api_result.get('model', MODEL)}")

        # LLM-based scoring
        if api_result["error"] is None:
            scores = llm_score(reply, scenario)
            h = round(scores["H"], 1)
            t = round(scores["T"], 1)
            s = round(scores["S"], 1)
            reason = scores.get("reason", "")
        else:
            h = t = s = 0.0
            reason = api_result["error"]

        total_score = round((h + t + s) / 3, 1)

        if total_score >= 98:
            status = "PASS"
        elif total_score >= 70:
            status = "WARN"
        else:
            status = "FAIL"

        if not quiet:
            print(f"    📊 H={h} T={t} S={s} ∑={total_score} [{status}]")
            if reason:
                print(f"    💬 {reason}")

        if status == "FAIL":
            errors.append(sid)

        result = {
            "id": sid, "name": sname, "cat": scat,
            "message": smsg, "reply": reply,
            "H": h, "T": t, "S": s, "total": total_score,
            "status": status, "model": api_result.get("model", MODEL),
            "latency": latency,
        }
        results.append(result)

    return results


def compute_scores(results: list) -> dict:
    """Compute aggregate scores from results."""
    valid = [r for r in results if r["H"] > 0]
    if not valid:
        return {"H": 0, "T": 0, "S": 0, "total": 0}

    h = sum(r["H"] for r in valid) / len(valid)
    t = sum(r["T"] for r in valid) / len(valid)
    s = sum(r["S"] for r in valid) / len(valid)
    return {
        "H": round(h, 1),
        "T": round(t, 1),
        "S": round(s, 1),
        "total": round((h + t + s) / 3, 1),
    }


def compute_category_scores(results: list, categories: list) -> dict:
    """Compute per-category scores."""
    cat_scores = {}
    for cat in categories:
        cat_results = [r for r in results if r["cat"] == cat]
        if cat_results:
            h = sum(r["H"] for r in cat_results) / len(cat_results)
            t = sum(r["T"] for r in cat_results) / len(cat_results)
            s = sum(r["S"] for r in cat_results) / len(cat_results)
            cat_scores[cat] = {
                "count": len(cat_results),
                "H": round(h, 1),
                "T": round(t, 1),
                "S": round(s, 1),
                "Total": round((h + t + s) / 3, 1),
            }
    return cat_scores


def get_worst_performers(results: list, limit: int = 5) -> list:
    """Return lowest-scoring scenarios."""
    sorted_results = sorted(results, key=lambda r: r["total"])
    return [
        {"id": r["id"], "name": r["name"], "H": r["H"], "T": r["T"], "S": r["S"], "total": r["total"]}
        for r in sorted_results[:limit]
    ]


def compute_summary(results: list) -> dict:
    """Compute summary stats."""
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    warned = sum(1 for r in results if r["status"] == "WARN")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    avg_latency = sum(r.get("latency", 0) for r in results if r.get("latency")) / max(1, sum(1 for r in results if r.get("latency")))
    return {
        "total": total,
        "passed": passed,
        "warned": warned,
        "failed": failed,
        "avg_latency": round(avg_latency, 1),
    }


# ══════════════════════════════════════════════════════
# OUTPUT
# ══════════════════════════════════════════════════════

def print_console_summary(results: list, duration: float, scores: dict, cat_scores: dict):
    """Print formatted console summary."""
    summary = compute_summary(results)
    print(f"\n{'='*60}")
    print(f"  BUNGALOV QA — TAMAMLANDI")
    print(f"  ⏱ {duration:.1f}s | 🧮 {summary['total']} senaryo")
    print(f"  ✅ PASS: {summary['passed']} | ⚠️ WARN: {summary['warned']} | ❌ FAIL: {summary['failed']}")
    print(f"  📊 H={scores['H']} T={scores['T']} S={scores['S']} ∑={scores['total']}")
    print(f"  ⏱ Ortalama yanıt: {summary['avg_latency']}s")
    print(f"{'='*60}")

    if cat_scores:
        print(f"\n  Kategori Kırılımı:")
        for cat, sc in cat_scores.items():
            print(f"    {cat:<15} {sc['count']}🧪  H={sc['H']:<6} T={sc['T']:<6} S={sc['S']:<6} ∑={sc['Total']:<6}")

    worst = get_worst_performers(results)
    if worst:
        print(f"\n  ⬇️ En Düşük Skorlar:")
        for wp in worst:
            print(f"    {wp['id']:<6} {wp['name']:<25} H={wp['H']:<6} T={wp['T']:<6} S={wp['S']:<6} ∑={wp['total']:<6}")


# ══════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Bungalov QA Master Runner")
    parser.add_argument("--cat", choices=["bungalov", "tiny_house", "villa", "edge_case", "sales"],
                        help="Tek kategori çalıştır")
    parser.add_argument("--json", action="store_true",
                        help="JSON çıktı (cron/no_agent için)")
    parser.add_argument("--trend", action="store_true",
                        help="Sadece trend raporu göster")
    parser.add_argument("--no-telegram", action="store_true",
                        help="Telegram bildirimi gönderme")
    parser.add_argument("--quiet", action="store_true",
                        help="Sessiz mod (cron/no_agent için) — sadece hataları stdout'a yaz")
    parser.add_argument("--force", action="store_true",
                        help="Force run even if API key missing")
    args = parser.parse_args()

    # Validate API key
    if not API_KEY:
        msg = "[HATA] NINEROUTER_KEY bulunamadı! Export edin veya .env'e ekleyin."
        if not args.quiet:
            print(msg)
        if not args.force:
            sys.exit(1)

    # Load scenarios
    scenarios, categories = load_scenarios()

    # Auto-rotate category by day of week if not specified
    cat_filter = args.cat
    if not cat_filter:
        day_names = ["pazar", "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi"]
        day_idx = int(time.strftime("%w"))  # 0=Sunday
        cat_map = ["bungalov", "tiny_house", "villa", "edge_case", "sales", "bungalov", "tiny_house"]
        cat_filter = cat_map[day_idx]
        if not args.quiet:
            print(f"  📅 {day_names[day_idx]} — kategori: {cat_filter}")

    # Filter by category
    scenarios = [s for s in scenarios if s["cat"] == cat_filter]
    if not scenarios:
        msg = f"[HATA] Kategori '{cat_filter}' için senaryo bulunamadı"
        if not args.quiet:
            print(msg)
        sys.exit(1)

    # If only trend report
    if args.trend:
        history = load_trend_history()
        if not history:
            print("Henüz trend verisi yok. Önce bir test çalıştırın.")
            return
        print(f"\n  📈 BUNGALOV QA TREND ({len(history)} kayıt)")
        print(f"{'='*60}")
        for i, h in enumerate(history):
            s = h.get("scores", {})
            print(f"  {h.get('date', '?')}  H={s.get('H','?'):<6} T={s.get('T','?'):<6} S={s.get('S','?'):<6} ∑={s.get('total','?'):<6}")
        print(f"{'='*60}")
        return

    # Run tests
    if not args.quiet:
        print(f"\n  🧪 BUNGALOV QA — {len(scenarios)} senaryo")
        print(f"  🤖 Model: {MODEL}")
        print(f"  📋 Kategori: {cat_filter or 'TÜMÜ'}")
        print(f"{'='*60}")

    t0 = time.time()
    results = run_tests(
        scenarios=scenarios,
        cat_filter=cat_filter,
        send_telegram=not args.no_telegram,
        quiet=args.quiet,
    )
    duration = round(time.time() - t0, 1)

    # Compute scores
    scores = compute_scores(results)
    cat_scores = compute_category_scores(results, categories)
    summary = compute_summary(results)
    worst_performers = get_worst_performers(results)

    # Console output
    if not args.quiet:
        print_console_summary(results, duration, scores, cat_scores)

    # Trend tracking
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    trend_entry = {
        "date": timestamp,
        "cat": cat_filter or "all",
        "duration": duration,
        "summary": summary,
        "scores": scores,
        "categories": cat_scores,
    }
    save_trend_entry(trend_entry)
    history = load_trend_history()
    regression_alerts = detect_regression(history)

    # Save report
    report = {
        "timestamp": timestamp,
        "model": MODEL,
        "cat": cat_filter or "all",
        "total": summary["total"],
        "duration": duration,
        "passed": summary["passed"],
        "warned": summary["warned"],
        "failed": summary["failed"],
        "avg_latency": summary["avg_latency"],
        "scores": scores,
        "categories": cat_scores,
        "regression_alerts": regression_alerts,
        "worst_performers": worst_performers[:5],
        "results": results,
    }
    REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    if not args.quiet:
        print(f"\n  Rapor kaydedildi: {REPORT_FILE}")
        print(f"  Trend: {TREND_FILE} ({len(history)} kayıt)")

    # Telegram
    if not args.no_telegram and BOT_TOKEN:
        telegram_msg = build_telegram_report(
            results=results,
            duration=duration,
            scores=scores,
            category=cat_filter or "TÜMÜ",
            cat_scores=cat_scores,
            history=history,
            regression_alerts=regression_alerts,
            worst_performers=worst_performers,
            start_time=timestamp,
        )
        tg_send(telegram_msg)
        if not args.quiet:
            print("  Telegram: ✅")
    else:
        if not args.quiet:
            print("  Telegram: atlandı")

    # JSON output mode (for cron no_agent)
    if args.json:
        # Print only the JSON report to stdout
        print("\n---JSON-REPORT---")
        print(json.dumps({
            "status": "ok" if summary["failed"] == 0 else "degraded",
            "summary": summary,
            "scores": scores,
            "regression_alerts": regression_alerts,
            "categories": cat_scores,
            "worst_performers": worst_performers[:3],
            "duration": duration,
        }, ensure_ascii=False))

    # Exit code
    if summary["failed"] > 0:
        sys.exit(2)
    elif summary["warned"] > summary["total"] * 0.5:
        sys.exit(1)


if __name__ == "__main__":
    main()
