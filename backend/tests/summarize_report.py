#!/usr/bin/env python3
"""QA test sonuçlarını GitHub Step Summary'e yazdırır."""
import json
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "tests/qa_v3_report.json"

try:
    with open(path) as f:
        r = json.load(f)
except (FileNotFoundError, json.JSONDecodeError) as e:
    print(f"::error::Rapor okunamadı: {e}")
    sys.exit(0)

print("| Metrik | Değer |")
print("|--------|-------|")
print(f"| Toplam Senaryo | {r.get('total', '?')} |")
print(f"| PASS | {r.get('pass_count', '?')} |")
print(f"| WARN | {r.get('warn_count', '?')} |")
print(f"| FAIL | {r.get('fail_count', '?')} |")
print(f"| İnsana Benzerlik (H) | {r.get('human_score', '?')} |")
print(f"| Güvenilirlik (T) | {r.get('trust_score', '?')} |")
print(f"| Satış (S) | {r.get('sales_score', '?')} |")
print(f"| Toplam | {r.get('total_score', '?')} |")
