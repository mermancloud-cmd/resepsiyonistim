#!/usr/bin/env python3
"""
Telegram Bot Notifier — Bungalov Resepsiyonist PROJESİ
@bungalovresepsiyonist_bot
"""

import os
import sys
import re
from pathlib import Path

# ─── Config: .env.local → env var ──────────────────

def _load_config():
    """Bot token ve chat ID'yi .env.local veya env var'dan oku."""
    cfg_token = ""
    cfg_chat = "7037064546"
    
    # .env.local'dan oku
    env_path = Path(__file__).resolve().parent.parent / ".env.local"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if "=" not in line or line.startswith("#"):
                    continue
                key, val = line.split("=", 1)
                val = val.strip().strip("\"'")
                if key == "BUNGALOV_BOT_TOKEN" and val:
                    cfg_token = val
                elif key == "BUNGALOV_CHAT_ID" and val:
                    cfg_chat = val
    
    # env var override
    cfg_token = os.environ.get("BUNGALOV_BOT_TOKEN", cfg_token)
    cfg_chat = os.environ.get("BUNGALOV_CHAT_ID", cfg_chat)
    
    return cfg_token, cfg_chat


TOKEN, CHAT_ID = _load_config()
API_BASE = f"https://api.telegram.org/bot{TOKEN}" if TOKEN else None

import requests

# ─── Helpers ───────────────────────────────────────

def send_message(text: str, parse_mode: str = "HTML") -> bool:
    if not TOKEN:
        print("[TELEGRAM] HATA: Bot token yok")
        return False
    
    if len(text) > 4000:
        text = text[:3997] + "..."
    
    try:
        resp = requests.post(
            f"{API_BASE}/sendMessage",
            json={
                "chat_id": CHAT_ID,
                "text": text,
                "parse_mode": parse_mode,
            },
            timeout=10,
        )
        if resp.status_code != 200:
            print(f"[TELEGRAM] HTTP {resp.status_code}: {resp.text[:200]}")
            return False
        return True
    except Exception as e:
        print(f"[TELEGRAM] Hata: {e}")
        return False


def send_long_message(text: str, parse_mode: str = "HTML") -> bool:
    if not TOKEN:
        return False
    
    max_len = 4000
    parts = []
    
    while len(text) > max_len:
        split_at = text.rfind("\n", 0, max_len)
        if split_at == -1:
            split_at = max_len
        parts.append(text[:split_at])
        text = text[split_at:].strip()
    
    if text:
        parts.append(text)
    
    success = True
    for part in parts:
        if not send_message(part, parse_mode):
            success = False
    
    return success


# ─── Test Conversation Format ──────────────────────

def notify_live_conversation(
    scenario_id: str,
    customer_msg: str,
    elif_reply: str,
    scores: dict = None,
):
    lines = [
        f"🧪 <b>#{scenario_id}</b> — CANLI TEST",
        "",
        f"👤 MÜŞTERİ: {customer_msg}",
        f"🤖 ELİF: {elif_reply}",
    ]
    
    if scores:
        lines.append("")
        h = scores.get("H", 0)
        t = scores.get("T", 0)
        s = scores.get("S", 0)
        lines.append(f"📊 H={h}  T={t}  S={s}")
    
    lines.append("─" * 30)
    return send_message("\n".join(lines))


def notify_live_batch(scenarios_results: list, category: str = None):
    if not TOKEN:
        return False
    
    header = f"🔥 <b>TEST SÜRÜMÜ</b>"
    if category:
        header += f" — {category.upper()}"
    
    messages = [header, "─" * 30]
    
    for sr in scenarios_results:
        messages.append("")
        messages.append(f"🧪 <b>#{sr['id']}</b> {sr.get('name', '')}")
        messages.append(f"👤 MÜŞTERİ: {sr['message']}")
        reply = sr['reply']
        if len(reply) > 300:
            reply = reply[:297] + "..."
        messages.append(f"🤖 ELİF: {reply}")
        if 'H' in sr and sr['H'] is not None:
            messages.append(f"📊 H={sr['H']}  T={sr['T']}  S={sr['S']}  [{sr.get('status', '')}]")
        messages.append("─" * 30)
    
    return send_long_message("\n".join(messages))


# ─── Report Notifications ──────────────────────────

def notify_report(report_text: str):
    text = f"📋 <b>TEST RAPORU</b>\n\n{report_text}"
    return send_message(text)


def notify_error(error_msg: str):
    text = f"🚨 <b>HATA</b>\n\n{error_msg}"
    return send_message(text)


def notify_status(status_msg: str):
    text = f"ℹ️ {status_msg}"
    return send_message(text)


# ─── CLI ────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) > 1:
        text = " ".join(sys.argv[1:])
        send_message(text)
    else:
        print("Kullanım: python telegram_notifier.py <mesaj>")
