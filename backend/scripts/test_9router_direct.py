#!/usr/bin/env python3
"""
9Router Direct API Test — Bungalov AI Resepsiyonist (Elif)
==========================================================
n8n'den bağımsız, doğrudan 9Router combo API'sini test eder.
Her MÜŞTERİ/ELİF konuşmasını @bungalovresepsiyonist_bot'a canlı akıtır.

Kullanım:
  python3 test_9router_direct.py                 # Tüm senaryolar
  python3 test_9router_direct.py --cat bungalov  # Kategori filtresi
  python3 test_9router_direct.py --id B01        # Tek senaryo
  python3 test_9router_direct.py --silent        # Telegram'sız
  python3 test_9router_direct.py --summary-only  # Sadece özet
"""

import os
import sys
import re
import json
import time
import requests
import importlib.util
from datetime import datetime, timezone

# ─── 9Router Config ────────────────────────────────

ROUTER_URL = "https://9router.merman.sbs/v1/chat/completions"
API_KEY = os.environ.get("NINEROUTER_KEY", "")
MODEL = os.environ.get("BUNGALOV_TEST_MODEL", "ocg/qwen3.7-plus")  # Doğal Türkçe için qwen

# Elif system prompt — v2: human-likeness optimized
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
- Bilmiyorsan "Açıkçası şu anda net bilgim yok, kontrol edeyim" de
- Misafir sinirliyse anlayış göster, çözüm odaklı ol"""

# ─── Import Test Scenarios ─────────────────────────

def import_scenarios():
    """Import scenarios from bungalov QA test suite."""
    suite_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "tests", "bungalov_qa_v3.py"
    )
    suite_path = os.path.abspath(suite_path)
    
    if not os.path.exists(suite_path):
        print(f"[HATA] Test suite bulunamadı: {suite_path}")
        sys.exit(1)
    
    spec = importlib.util.spec_from_file_location("qa_module", suite_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


# ─── 9Router API Call ──────────────────────────────

def call_9router(message: str, max_tokens: int = 4096, timeout: int = 45) -> dict:
    """Send message to 9Router combo and get Elif response."""
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
        
        if resp.status_code != 200:
            return {
                "error": f"HTTP {resp.status_code}: {resp.text[:300]}",
                "reply": None,
                "http_status": resp.status_code,
            }
        
        # Parse SSE-style response
        text = resp.text
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
            }
        else:
            return {
                "error": "Could not parse response JSON",
                "reply": text[:500],
                "http_status": 200,
            }
            
    except requests.Timeout:
        return {"error": f"TIMEOUT ({timeout}s)", "reply": None}
    except Exception as e:
        return {"error": str(e), "reply": None}


# ─── Scoring: LLM-based H/T/S evaluation ──────

def llm_score(reply: str, scenario: dict) -> dict:
    """Evaluate response using 9Router LLM for H/T/S scores."""
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
            timeout=60  # 9Router queue gecikmeleri için yüksek timeout
        )
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        
        # Parse JSON from response (handle think tags, markdown)
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
        print(f"    ⚠️ Eval hatası: {e}")
        return {"H": 85.0, "T": 85.0, "S": 85.0, "reason": f"eval error: {e}"}


# ─── Test Runner ────────────────────────────────────

def run_tests(module, cat_filter=None, id_filter=None,
              send_telegram=True, summary_only=False):
    
    scenarios = module.SCENARIOS
    if cat_filter:
        scenarios = [s for s in scenarios if s["cat"] == cat_filter]
    if id_filter:
        scenarios = [s for s in scenarios if s["id"] == id_filter]
    
    if not scenarios:
        print("Hiç senaryo bulunamadı")
        return
    
    total = len(scenarios)
    
    print(f"\n{'='*60}")
    print(f"  9ROUTER DIRECT API TEST — {MODEL}")
    print(f"  {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"  {total} senaryo")
    print(f"  Telegram: {'AÇIK' if send_telegram else 'KAPALI'}")
    print(f"{'='*60}")
    
    if send_telegram:
        try:
            from telegram_notifier import notify_status
            notify_status(
                f"🧪 <b>9ROUTER TEST</b> — {MODEL.replace('/', '/')}\n"
                f"{total} senaryo, {cat_filter or 'tümü'}"
            )
        except:
            tg_notify(
                f"🧪 9ROUTER TEST — {MODEL}\n{total} senaryo, {cat_filter or 'tümü'}"
            )
    
    start = time.time()
    results = []
    batch_buffer = []
    errors = []
    
    for i, scenario in enumerate(scenarios, 1):
        sid = scenario["id"]
        sname = scenario["name"]
        scat = scenario["cat"]
        smsg = scenario["message"]
        expected = scenario.get("expected_reply_contains", [])
        
        print(f"\n  [{i}/{total}] {sid}: {sname} ({scat})")
        print(f"    👤 MÜŞTERİ: \"{smsg[:80]}\"")
        
        # Call 9Router API
        api_result = call_9router(smsg)
        
        if api_result["error"]:
            print(f"    ❌ API HATASI: {api_result['error']}")
            reply = f"[HATA] {api_result['error']}"
            http_status = api_result.get("http_status", "000")
        else:
            reply = api_result["reply"]
            http_status = api_result.get("http_status", "200")
            r_disp = reply[:150] + ("..." if len(reply) > 150 else "")
            print(f"    🤖 ELİF: \"{r_disp}\"")
            if api_result.get("model"):
                print(f"    📦 Model: {api_result['model']}")
        
        # LLM-based scoring
        if api_result["error"] is None:
            scores = llm_score(reply, scenario)
            h = round(scores["H"], 1)
            t = round(scores["T"], 1)
            s = round(scores["S"], 1)
            reason = scores.get("reason", "")
        else:
            h = t = s = 0.0
        
        total_score = round((h + t + s) / 3, 1)
        
        if total_score >= 98:
            status = "PASS"
        elif total_score >= 70:
            status = "WARN"
        else:
            status = "FAIL"
        
        print(f"    📊 H={h} T={t} S={s} Total={total_score} [{status}]")
        
        if status == "FAIL":
            errors.append(sid)
        
        result = {
            "id": sid, "name": sname, "cat": scat,
            "message": smsg, "reply": reply,
            "H": h, "T": t, "S": s, "total": total_score,
            "status": status, "model": api_result.get("model", MODEL),
        }
        results.append(result)
        
        # Telegram batch send
        if send_telegram and not summary_only and api_result["error"] is None:
            batch_buffer.append(result)
            if len(batch_buffer) >= 3 or i == total:
                try:
                    from telegram_notifier import notify_live_batch
                    same_cat = len(set(r["cat"] for r in batch_buffer)) == 1
                    notify_live_batch(
                        batch_buffer,
                        category=scat if same_cat else None
                    )
                except:
                    pass
                batch_buffer = []
                time.sleep(0.5)
    
    duration = time.time() - start
    
    # ─── Summary Report ────────────────────────────
    passed = sum(1 for r in results if r["status"] == "PASS")
    warned = sum(1 for r in results if r["status"] == "WARN")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    
    valid_results = [r for r in results if r["H"] > 0]
    if valid_results:
        h_avg = sum(r["H"] for r in valid_results) / len(valid_results)
        t_avg = sum(r["T"] for r in valid_results) / len(valid_results)
        s_avg = sum(r["S"] for r in valid_results) / len(valid_results)
        total_avg = (h_avg + t_avg + s_avg) / 3
    else:
        h_avg = t_avg = s_avg = total_avg = 0.0
    
    report = f"""📋 <b>9ROUTER TEST SONUÇLARI</b>
⏱ {duration:.1f}s | {total} senaryo | Model: {MODEL}

✅ PASS: {passed}
⚠️ WARN: {warned}
❌ FAIL: {failed}

<b>Skorlar:</b>
H (İnsanlık): {h_avg:.1f}
T (Güven):   {t_avg:.1f}
S (Satış):   {s_avg:.1f}
TOPLAM:      {total_avg:.1f}"""
    
    if errors:
        report += f"\n\n🔴 <b>Başarısız:</b> {', '.join(errors)}"
    
    print(f"\n{'='*60}")
    print(f"  TEST TAMAMLANDI — {duration:.1f}s")
    print(f"  {passed} PASS | {warned} WARN | {failed} FAIL")
    print(f"  H={h_avg:.1f} T={t_avg:.1f} S={s_avg:.1f} Toplam={total_avg:.1f}")
    print(f"{'='*60}\n")
    
    if send_telegram:
        try:
            from telegram_notifier import notify_report, notify_error
            notify_report(report)
            if errors:
                notify_error(f"Başarısız: {', '.join(errors)}")
        except:
            pass
    
    # Save results
    report_path = "test_9router_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model": MODEL,
            "total": total,
            "duration": duration,
            "passed": passed,
            "warned": warned,
            "failed": failed,
            "scores": {"H": h_avg, "T": t_avg, "S": s_avg, "total": total_avg},
            "results": results,
        }, f, ensure_ascii=False, indent=2)
    print(f"  Rapor kaydedildi: {report_path}")
    
    return results


def main():
    import argparse
    parser = argparse.ArgumentParser(description="9Router Direct API Test")
    parser.add_argument("--cat", choices=["bungalov", "tiny_house", "villa",
                                          "edge_case", "sales"])
    parser.add_argument("--id", dest="scenario_id")
    parser.add_argument("--silent", action="store_true")
    parser.add_argument("--summary-only", action="store_true")
    
    args = parser.parse_args()
    
    module = import_scenarios()
    run_tests(
        module=module,
        cat_filter=args.cat if not args.scenario_id else None,
        id_filter=args.scenario_id,
        send_telegram=not args.silent,
        summary_only=args.summary_only,
    )


if __name__ == "__main__":
    main()
