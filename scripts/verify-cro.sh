#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# K10 — CRO element verification
# Checks that all K8 CRO elements are present in the built HTML output.
# Usage: ./scripts/verify-cro.sh [base_url]
#   base_url defaults to https://panel.merman.sbs
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE_URL="${1:-https://panel.merman.sbs}"
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

check_html() {
  local url="$1"
  local pattern="$2"
  local label="$3"

  local html
  html=$(curl -s --max-time 10 "$url" 2>/dev/null || true)

  if echo "$html" | grep -qE "$pattern"; then
    echo -e "  ${GREEN}✓${NC} $label"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $label — pattern not found: $pattern"
    FAIL=$((FAIL + 1))
  fi
}

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  K10 — CRO Element Verification"
echo "  Target: $BASE_URL"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "══════════════════════════════════════════════"
echo ""

# ── CRO Element Checks ────────────────────────────────────────────────────────

echo "── Social Proof Metrics ──"
check_html "${BASE_URL}/" \
  'Aktif.*İşletme|24.*Mesaj.*İşlendi|Ort\..*Yanıt.*Süresi|Memnuniyet' \
  "Social proof stat labels present"

check_html "${BASE_URL}/" \
  'data-event="Social Proof Seen"' \
  "Social proof data-event attribute"

echo ""
echo "── Trust Badges ──"
check_html "${BASE_URL}/" \
  'ISO 27001|256-bit SSL|99\.9.*Uptime' \
  "Trust badge labels present"

check_html "${BASE_URL}/" \
  'data-event="Trust Badge Seen"' \
  "Trust badge data-event attribute"

echo ""
echo "── Sticky Mobile CTA ──"
check_html "${BASE_URL}/" \
  'sm:hidden.*Ücretsiz Dene|sticky.*cta|data-event="Sticky CTA Click"' \
  "Sticky mobile CTA bar present"

echo ""
echo "── Exit Intent Popup ──"
check_html "${BASE_URL}/" \
  'data-event="Exit Popup Conversion"' \
  "Exit-intent popup CTA data-event attribute"

echo ""
echo "── Pricing Table ──"
check_html "${BASE_URL}/" \
  'Başlangıç|Profesyonel|Kurumsal' \
  "Pricing tier labels present"

check_html "${BASE_URL}/" \
  'data-event="Pricing Tier Click"' \
  "Pricing tier data-event attribute"

echo ""
echo "── Hero CTA Buttons ──"
check_html "${BASE_URL}/" \
  'data-event="Hero CTA Click"' \
  "Hero CTA button data-event attribute"

check_html "${BASE_URL}/" \
  'data-event="WhatsApp Demo Click"' \
  "WhatsApp demo button data-event attribute"

echo ""
echo "── Analytics Script ──"
check_html "${BASE_URL}/" \
  'plausible\.io/js/script' \
  "Plausible analytics script loaded"

echo ""
echo "──────────────────────────────────────────────"
if [[ "$FAIL" -eq 0 ]]; then
  echo -e "  ${GREEN}ALL $PASS CRO CHECKS PASSED${NC}"
else
  echo -e "  ${RED}$FAIL CRO CHECKS FAILED, $PASS PASSED${NC}"
fi
echo "──────────────────────────────────────────────"
echo ""

exit $FAIL
