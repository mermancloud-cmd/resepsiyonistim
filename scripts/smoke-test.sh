#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# K10 — Post-deploy smoke test
# Checks critical pages return HTTP 200.
# Usage: ./scripts/smoke-test.sh [base_url]
#   base_url defaults to https://panel.merman.sbs
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE_URL="${1:-https://panel.merman.sbs}"
PASS=0
FAIL=0
FAILED_ENDPOINTS=""

# Colours
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  local url="$1"
  local label="$2"
  local http_code

  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

  if [[ "$http_code" == "000" ]]; then
    echo -e "  ${RED}✗${NC} $label — connection failed (timeout / DNS)"
    FAIL=$((FAIL + 1))
    FAILED_ENDPOINTS="${FAILED_ENDPOINTS}\n  - $label ($url): connection failed"
  elif [[ "$http_code" -ge 200 && "$http_code" -lt 400 ]]; then
    echo -e "  ${GREEN}✓${NC} $label — HTTP $http_code"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $label — HTTP $http_code"
    FAIL=$((FAIL + 1))
    FAILED_ENDPOINTS="${FAILED_ENDPOINTS}\n  - $label ($url): HTTP $http_code"
  fi
}

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  K10 Smoke Test"
echo "  Target: $BASE_URL"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "══════════════════════════════════════════════"
echo ""

# ── Pages ─────────────────────────────────────────────────────────────────────
check "${BASE_URL}/"                      "Landing page (/)"
check "${BASE_URL}/login"                 "Login (/login)"
check "${BASE_URL}/subscription"          "Subscription (/subscription)"
check "${BASE_URL}/dashboard"             "Dashboard (/dashboard)"
check "${BASE_URL}/settings"              "Settings (/settings)"
check "${BASE_URL}/settings/channels"     "Channels (/settings/channels)"
check "${BASE_URL}/analytics/revenue"     "Revenue analytics (/analytics/revenue)"
check "${BASE_URL}/api/health"            "Health check (/api/health)"
check "${BASE_URL}/api/vitals"            "Vitals API (/api/vitals)"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────────"
if [[ "$FAIL" -eq 0 ]]; then
  echo -e "  ${GREEN}ALL $PASS TESTS PASSED${NC}"
else
  echo -e "  ${RED}$FAIL FAILED, $PASS PASSED${NC}"
  echo -e "  Failed endpoints:${FAILED_ENDPOINTS}"
fi
echo "──────────────────────────────────────────────"
echo ""

exit $FAIL
