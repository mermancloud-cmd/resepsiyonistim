# HERMES QA Test Results — 2026-06-23

## Task: t_762b42cb — QA re-run with reconstructed test suite
## Tester: qa-test-engineer
## Date: 2026-06-23T23:50 UTC

---

## 1. Executive Summary

| Metric | Result | Baseline (2026-06-22) | Status |
|--------|--------|-----------------------|--------|
| Total Scenarios | 43 | 43 | PASS (structure) |
| PASS | 0 | 43 | FAIL |
| WARN | 43 | 0 | FAIL |
| FAIL | 0 | 0 | OK |
| Human (H) | 83.6 | 100.0 | FAIL |
| Trust (T) | 86.7 | 99.1 | FAIL |
| Sales (S) | 93.0 | 99.3 | FAIL |
| Total | 87.8 | 99.5 | FAIL |

**Overall Result: SYSTEM NOT TESTED — All 43 scenarios returned mock responses**

---

## 2. Root Cause Analysis

### 2.1 Primary Blocker: WF07 Smoke Test Webhook Down (404)

All 43 test scenarios hit `POST /webhook/smoke-test` and received HTTP 404:

```json
{"code":404,"message":"The requested webhook \"POST smoke-test\" is not registered."}
```

- `N8N_WORKFLOWS.md` documents WF07 as PASIF (disabled) since reconstruction
- After ~21 requests, endpoint switched from 404 to 429 (rate limiting)
- Test suite falls back to static mock reply: `"Merhaba, {scenario['name']} ile ilgili yardımcı olabilirim."`
- Mock response is a template that cannot match scenario-specific keywords, producing low scores

### 2.2 Secondary Issue: No n8n API Access

```
curl https://n8n.merman.sbs/api/v1/workflows → {"message":"'X-N8N-API-KEY' header required"}
```

Cannot activate WF07 programmatically — API key required but not available in workspace.

### 2.3 Tertiary Issue: Environment Dependencies

- `requests` module not installed in qa-test-engineer profile's Python
- Required `PYTHONPATH` workaround to use supabase-data-engineer profile's site-packages
- No root/sudo access to install system packages

---

## 3. Scenario-Level Results

All 43 scenarios → WARN status (scores 84.0–97.3).

### Category Breakdown

| Category | Count | H | T | S | Total |
|----------|-------|---|---|---|-------|
| bungalov | 12 | 82.8 | 85.6 | 98.8 | 89.1 |
| tiny_house | 8 | 82.0 | 85.0 | 86.9 | 84.6 |
| villa | 10 | 85.0 | 89.5 | 95.5 | 90.0 |
| edge_case | 8 | 85.8 | 87.6 | 90.6 | 88.0 |
| sales | 5 | 82.0 | 85.0 | 88.0 | 85.0 |

### Top 3 Scoring Scenarios (mock responses)
1. V01 Villa selamlama — 97.3 (greeting matches "merhaba")
2. V02 Villa havuz — 97.3
3. V05 Villa deniz manzarasi — 97.3

### Bottom 3 Scoring Scenarios (mock responses)
1. B10 Kahvalti — 84.0
2. TH01–TH08 — 84.0 (all tiny house scenarios)
3. V07 Villa jakuzi — 84.0

---

## 4. Test Infrastructure Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| WF07 webhook not registered (HTTP 404) | CRITICAL | All 43 tests use mock data, zero real AI testing |
| n8n API key unavailable | HIGH | Cannot activate webhook from test container |
| Missing `requests` module | MEDIUM | Required PYTHONPATH workaround |
| Rate limiting after ~21 req | LOW | Only affects mock path |

---

## 5. P0 Critical Test Scenarios — Manual Check

These cannot be verified via the test suite until WF07 is active:

| Scenario | Status | Notes |
|----------|--------|-------|
| Human handoff guard | NOT TESTED | Requires real AI response |
| Uydurma fiyat engeli | NOT TESTED | No pricing_result available |
| Uydurma müsaitlik engeli | NOT TESTED | No availability_result available |
| Tekrar soru engeli | NOT TESTED | No conversation state |
| Reservation lock conflict | NOT TESTED | Requires real system |

---

## 6. Recommendations

1. **HIGHEST PRIORITY**: Activate WF07 smoke test webhook in n8n (n8n UI → WF07 → Activate)
2. **HIGH**: Set `N8N_API_KEY` env var in container for programmatic access
3. **MEDIUM**: Install `python3-requests` via apt or set up venv for qa-test-engineer profile
4. **LOW**: Add rate-limit tolerance (exponential backoff) to test suite
5. **INFO**: After WF07 is fixed, re-run with `python bungalov_qa_v3.py --endpoint <alternative if needed>`

---

## 7. Artifacts

- `/opt/data/project-memory/bungalow-ai/elif_test_report.json` — Full test result JSON
- `/opt/data/project-memory/bungalow-ai/bungalov_qa_v3.py` — Test suite (reconstructed)
- `/opt/data/test-suite/qa_v3_report.json` — Raw output
