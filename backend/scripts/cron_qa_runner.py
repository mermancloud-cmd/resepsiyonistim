#!/usr/bin/env python3
"""
Bungalov QA cron job runner.
Runs a subset of scenarios and reports to Telegram.
"""
import os, sys, json, subprocess, time
from pathlib import Path

SCRIPTS_DIR = Path("/opt/hermes/bungalovresepsiyonist54/scripts")
REPORT_FILE = SCRIPTS_DIR / "test_9router_report.json"

# Rotate through scenario categories each run
CATEGORIES = ["bungalov", "tiny_house", "villa", "edge_case", "sales"]

def get_today_category():
    """Pick category based on day of week."""
    day = int(time.strftime("%w"))  # 0=Sunday
    return CATEGORIES[day % len(CATEGORIES)]

def run_test(category):
    print(f"Running tests for category: {category}")
    result = subprocess.run(
        [sys.executable, "test_9router_direct.py", "--silent", "--cat", category],
        cwd=str(SCRIPTS_DIR),
        capture_output=True, text=True, timeout=600
    )
    print(result.stdout[-2000:])
    if result.stderr:
        print(f"STDERR: {result.stderr[-500:]}")
    return result.returncode == 0

def send_telegram(text):
    """Send message via bot API."""
    import urllib.request, urllib.error
    
    # Read token from .env.local
    token = None
    env_path = SCRIPTS_DIR.parent / ".env.local"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("BUNGALOV_BOT_TOKEN=") or line.startswith("BOT_TOKEN="):
                    token = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    
    if not token:
        token = os.environ.get("BUNGALOV_BOT_TOKEN") or os.environ.get("TELEGRAM_BOT_TOKEN")
    
    if not token:
        print("No bot token found")
        return False
    
    # Get chat_id from report or use default
    chat_id = "7037064546"  # Umut's DM
    
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }).encode()
    
    try:
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        resp = urllib.request.urlopen(req, timeout=15)
        return True
    except Exception as e:
        print(f"Telegram send failed: {e}")
        return False

def read_report():
    if REPORT_FILE.exists():
        with open(REPORT_FILE) as f:
            return json.load(f)
    return None

if __name__ == "__main__":
    category = get_today_category()
    
    # Run the test
    success = run_test(category)
    
    # Read results
    report = read_report()
    
    if report:
        scores = report.get("scores", {})
        h = scores.get("H", 0)
        t = scores.get("T", 0)
        s = scores.get("S", 0)
        total = scores.get("total", 0)
        passed = report.get("passed", 0)
        warned = report.get("warned", 0)
        failed = report.get("failed", 0)
        
        # Build message
        msg = f"🧪 *Bungalov QA Raporu* ({time.strftime('%d.%m.%Y %H:%M')})\n"
        msg += f"Kategori: {category}\n"
        msg += f"\n📊 H={h:.1f} T={t:.1f} S={s:.1f} Toplam={total:.1f}"
        msg += f"\n✅ {passed} PASS | ⚠️ {warned} WARN | ❌ {failed} FAIL"
        
        alert = ""
        if total < 90:
            alert = "\n\n🚨 *DİKKAT*: Toplam skor 90 altında!"
        if h < 85:
            alert += "\n👤 İnsanlık skoru düşük!"
        if failed > 0:
            alert += "\n❌ Başarısız senaryo var!"
        
        if alert:
            msg += alert
        
        send_telegram(msg)
        print("Report sent to Telegram")
    else:
        send_telegram(f"🧪 Test çalıştı ({category}) ama rapor bulunamadı.")
    
    sys.exit(0 if success else 1)
