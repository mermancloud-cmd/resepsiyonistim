#!/usr/bin/env python3
"""
Multi-Turn Dialog Scenario Tests — Bungalov AI Resepsiyonist
==============================================================
8+ senaryo ile multi-turn diyalog akışlarını tanımlar.

Her senaryo:
  - id: Benzersiz senaryo kodu
  - name: Açıklayıcı isim
  - turns: (giriş_mesajı, beklenen_kontroller) çiftleri listesi
  - validation: Her adımda yanıtın içermesi beklenen kelimeler/regex

Bu dosya LLM çağırmaz — sadece prompt cevap validasyon şablonları sağlar.
Test koşucusu her turn'ü AI sistemine gönderip yanıtı bu şablonlarla karşılaştırır.

Çalıştırma (örnek test runner ile):
    python -c "from test_multi_turn_scenarios import SCENARIOS; print(f'{len(SCENARIOS)} senaryo yuklu')"

Kullanım:
    from test_multi_turn_scenarios import SCENARIOS, validate_turn
    for s in SCENARIOS:
        for i, (msg, checks) in enumerate(s["turns"]):
            response = send_to_ai(msg)
            ok, err = validate_turn(response, checks)
            assert ok, f\"{s['id']} turn {i}: {err}\"
"""

import re
from typing import Any


# ─── Validation Helpers ──────────────────────────────────────────────────


def validate_turn(response: str, checks: dict) -> tuple:
    """
    Validate a turn response against expected checks.

    checks dict keys (all optional):
      - must_contain:    List[str] — yanıt bu kelimelerin hepsini içermeli
      - must_not_contain: List[str] — yanıt bu kelimelerin hiçbirini içermemeli
      - regex:           str — yanıt bu regex'i karşılamalı
      - min_length:      int — minimum karakter sayısı
      - no_phrases:      List[str] — yasaklı ifadeler (rol dışı vs)
      - category_check:  str — hangi kategorinin kontrol edileceği

    Returns: (bool, str) — (geçti_mi, hata_mesajı)
    """
    if not response or not isinstance(response, str):
        return False, "Yanıt boş veya geçersiz tip"

    # must_contain
    for word in checks.get("must_contain", []):
        if word.lower() not in response.lower():
            return False, f"Beklenen '{word}' yanıtta bulunamadı"

    # must_not_contain
    for word in checks.get("must_not_contain", []):
        if word.lower() in response.lower():
            return False, f"Yasak '{word}' yanıtta bulundu"

    # regex
    pattern = checks.get("regex")
    if pattern:
        if not re.search(pattern, response, re.IGNORECASE):
            return False, f"Regex '{pattern}' eşleşmedi"

    # min_length
    min_len = checks.get("min_length", 0)
    if len(response.strip()) < min_len:
        return False, f"Yanıt çok kısa ({len(response.strip())} < {min_len})"

    # no_phrases (rol dışı ifadeler)
    for phrase in checks.get("no_phrases", []):
        if phrase.lower() in response.lower():
            return False, f"Rol dışı ifade '{phrase}' bulundu"

    return True, ""


# ─── Scenario 1: Tam Rezervasyon Akışı ──────────────────────────────────

SCENARIO_FULL_BOOKING = {
    "id": "MT01",
    "name": "Tam rezervasyon akisi (selam → tarih → kisi → birim → onay)",
    "cat": "reservation",
    "turns": [
        {
            "input": "Merhaba, bungalovunuz hakkinda bilgi almak istiyorum",
            "checks": {
                "must_contain": ["merhaba", "hoş geldiniz", "yardımcı"],
                "min_length": 30,
            },
        },
        {
            "input": "15 Agustos'ta 2 kisi icin bos yer var mi?",
            "checks": {
                "must_contain": ["ağustos", "müsaitlik", "kontrol"],
                "min_length": 40,
            },
        },
        {
            "input": "3 gece kalmak istiyoruz, hangi uniteler bos?",
            "checks": {
                "must_contain": ["birim", "bungalov", "seçenek"],
                "min_length": 40,
            },
        },
        {
            "input": "Buyuk bungalov uygun gorunuyor, fiyati nedir?",
            "checks": {
                "must_contain": ["fiyat", "gecelik", "hesapla"],
                "min_length": 30,
            },
        },
        {
            "input": "Tamam rezervasyon yapmak istiyorum, adim Ahmet Yilmaz",
            "checks": {
                "must_contain": ["rezervasyon", "alındı", "onay"],
                "min_length": 40,
            },
        },
    ],
}

# ─── Scenario 2: Iptal Akisi ───────────────────────────────────────────

SCENARIO_CANCELLATION = {
    "id": "MT02",
    "name": "Iptal akisi",
    "cat": "cancellation",
    "turns": [
        {
            "input": "Rezervasyonumu iptal etmek istiyorum",
            "checks": {
                "must_contain": ["iptal", "bilgi", "kod"],
                "min_length": 40,
            },
        },
        {
            "input": "Rezervasyon kodum: BR-2026-0719",
            "checks": {
                "must_contain": ["iptal", "politika", "ücret"],
                "min_length": 50,
            },
        },
        {
            "input": "Anladim, devam edin lütfen, iptal edelim",
            "checks": {
                "must_contain": ["iptal", "edildi", "onay"],
                "min_length": 40,
            },
        },
    ],
}

# ─── Scenario 3: Engelle Karsilasma + Insana Devir ─────────────────────

SCENARIO_HANDOFF = {
    "id": "MT03",
    "name": "Engelle karsilasma + insana devir",
    "cat": "handoff",
    "turns": [
        {
            "input": "Cok acil, patronla gorusmem lazim simdi hemen!",
            "checks": {
                "must_contain": ["yönlendir", "yetkili", "operatör"],
                "min_length": 40,
            },
        },
        {
            "input": "Bu isi cozemiyorsan beni yoneticinize bagla!",
            "checks": {
                "must_contain": ["aktarıyorum", "bekle", "canlı"],
                "min_length": 30,
            },
        },
    ],
}

# ─── Scenario 4: Dil Degistirme (Turkce → Ingilizce) ───────────────────

SCENARIO_LANGUAGE_SWITCH = {
    "id": "MT04",
    "name": "Dil degistirme (Turkce → Ingilizce)",
    "cat": "language",
    "turns": [
        {
            "input": "Merhaba, bungalov fiyatlarini ogrenebilir miyim?",
            "checks": {
                "must_contain": ["merhaba", "fiyat"],
                "min_length": 30,
            },
        },
        {
            "input": "Do you speak English? I want to make a reservation.",
            "checks": {
                "must_contain": ["english", "switch", "reservation"],
                "min_length": 30,
            },
        },
        {
            "input": "Thank you. I'd like to book a bungalow for 2 people.",
            "checks": {
                "must_contain": ["bungalow", "people", "date"],
                "min_length": 30,
            },
        },
    ],
}

# ─── Scenario 5: AI Oldugunu Sorunca Dürüst Yanit (E04 fix) ────────────

SCENARIO_AI_IDENTITY = {
    "id": "MT05",
    "name": "AI oldugunu sorunca durust yanit (E04 fix)",
    "cat": "identity",
    "turns": [
        {
            "input": "Sen robot musun? Yapay zeka misin?",
            "checks": {
                "must_contain": ["yapay zeka", "asistan", "Elif"],
                "must_not_contain": ["insan", "gerçek kişi"],
                "min_length": 30,
            },
        },
        {
            "input": "Yani sen bir AI'sin yani, dogru mu anladim?",
            "checks": {
                "must_contain": ["ai", "yapay zeka", "doğru"],
                "min_length": 20,
            },
        },
    ],
}

# ─── Scenario 6: Siir vs konu disi talep (Rol Koruma - E06 fix) ────────

SCENARIO_OFF_TOPIC = {
    "id": "MT06",
    "name": "Siir vs konu disi talep (rol koruma - E06 fix)",
    "cat": "edge_case",
    "turns": [
        {
            "input": "Bana bir siir soyle bungalov hakkinda",
            "checks": {
                "must_contain": ["bungalov", "rezervasyon"],
                "no_phrases": ["şiir", "bir şiir", "kafiye"],
                "min_length": 30,
                # AI should politely decline poetry and steer back to business
            },
        },
        {
            "input": "Peki matematik sorusu: 123 * 456 kac eder?",
            "checks": {
                "must_contain": ["bungalov", "rezervasyon", "yardımcı"],
                "min_length": 30,
                # Should redirect to booking topics, not answer math
            },
        },
        {
            "input": "Hava durumu nasil bugun?",
            "checks": {
                "must_contain": ["bungalov", "hava", "konaklama"],
                "min_length": 20,
            },
        },
    ],
}

# ─── Scenario 7: GDPR Veri Silme Talebi ────────────────────────────────

SCENARIO_GDPR = {
    "id": "MT07",
    "name": "GDPR veri silme talebi",
    "cat": "privacy",
    "turns": [
        {
            "input": "Benimle ilgili tum verileri silmenizi istiyorum",
            "checks": {
                "must_contain": ["veri", "silme", "yetkili"],
                "min_length": 40,
            },
        },
        {
            "input": "KVKK kapsaminda verilerimin silinmesini talep ediyorum",
            "checks": {
                "must_contain": ["kvkk", "veri", "yönlendir"],
                "min_length": 40,
            },
        },
        {
            "input": "Telefon numaram: +905551112233, lutfen silin",
            "checks": {
                "must_contain": ["işleme", "alındı", "ekip"],
                "min_length": 40,
            },
        },
    ],
}

# ─── Scenario 8: Fiyat Sorgulama + Musaitlik ───────────────────────────

SCENARIO_PRICE_AVAILABILITY = {
    "id": "MT08",
    "name": "Fiyat sorgulama + musaitlik",
    "cat": "sales",
    "turns": [
        {
            "input": "Eylul ayinda hangi tarihlerde bos yer var?",
            "checks": {
                "must_contain": ["eylül", "müsait", "tarih"],
                "min_length": 30,
            },
        },
        {
            "input": "3-6 Eylul arasi kucuk bungalov fiyati ne kadar?",
            "checks": {
                "must_contain": ["fiyat", "gecelik", "toplam"],
                "min_length": 40,
            },
        },
        {
            "input": "Indirim veya erken rezervasyon firsatiniz var mi?",
            "checks": {
                "must_contain": ["indirim", "erken", "fırsat"],
                "min_length": 30,
            },
        },
        {
            "input": "Depozito ne kadar? Kapora istiyor musunuz?",
            "checks": {
                "must_contain": ["kapora", "depozito", "ödeme"],
                "min_length": 30,
            },
        },
    ],
}

# ─── Bonus Scenario 9: Coklu Karakter Girisi / Ozel Karakterler ───────

SCENARIO_SPECIAL_CHARS = {
    "id": "MT09",
    "name": "Ozel karakter ve Unicode dayanikliligi",
    "cat": "edge_case",
    "turns": [
        {
            "input": "Merhaba! Bungalovunuz cok guzelmis. 🏡✨",
            "checks": {
                "must_contain": ["merhaba", "teşekkür"],
                "min_length": 30,
            },
        },
        {
            "input": "Şey... acaba... yani... fiyat nedir? 🙏",
            "checks": {
                "must_contain": ["fiyat", "sormak"],
                "min_length": 20,
            },
        },
    ],
}

# ─── Scenario 10: Arapca Dil Testi ─────────────────────────────────────

SCENARIO_ARABIC = {
    "id": "MT10",
    "name": "Arapca dil destegi",
    "cat": "language",
    "turns": [
        {
            "input": "السلام عليكم، هل لديكم بنغالو متاح؟",
            "checks": {
                "must_contain": ["بنغالو", "متاح"],
                "min_length": 30,
            },
        },
        {
            "input": "كم سعر الليلة الواحدة؟",
            "checks": {
                "must_contain": ["سعر", "ليلة"],
                "min_length": 20,
            },
        },
    ],
}

# ─── Combined Export ────────────────────────────────────────────────────

SCENARIOS = [
    SCENARIO_FULL_BOOKING,
    SCENARIO_CANCELLATION,
    SCENARIO_HANDOFF,
    SCENARIO_LANGUAGE_SWITCH,
    SCENARIO_AI_IDENTITY,
    SCENARIO_OFF_TOPIC,
    SCENARIO_GDPR,
    SCENARIO_PRICE_AVAILABILITY,
    SCENARIO_SPECIAL_CHARS,
    SCENARIO_ARABIC,
]

# ─── CLI / Test Runner ──────────────────────────────────────────────────


def run_validation_tests(send_fn, scenarios=None):
    """
    Run validation tests against a send function.

    Args:
        send_fn: callable(input_text) -> response_text
        scenarios: optional list, defaults to SCENARIOS

    Returns: list of (scenario_id, turn_index, passed, error_msg)
    """
    results = []
    for sc in (scenarios or SCENARIOS):
        for i, turn in enumerate(sc["turns"]):
            try:
                response = send_fn(turn["input"])
            except Exception as e:
                results.append((sc["id"], i, False, f"Send error: {e}"))
                continue
            ok, err = validate_turn(response, turn["checks"])
            results.append((sc["id"], i, ok, err))
    return results


if __name__ == "__main__":
    print(f"Multi-Turn Dialog Scenarios: {len(SCENARIOS)} senaryo")
    for s in SCENARIOS:
        turns = len(s["turns"])
        print(f"  {s['id']}: {s['name']} ({turns} adim)")
    print(f"\nToplam tur: {sum(len(s['turns']) for s in SCENARIOS)}")
