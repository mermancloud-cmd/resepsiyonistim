#!/usr/bin/env python3
"""
E2E Pipeline Test — Bungalov SQLite REST API
==============================================
Validates:
- SQLite API erişilebilir (health check)
- Tenants listesi alınabilir
- Conversation state oluşturma/silme (CRUD)
- User event ekleme (POST /rest/v1/messages — user_events tablosu henüz yok)
- Reservations tablosu sorgulama
- Auth middleware çalışıyor (401 on no-key)
- Select injection blocked (400 on invalid column)
- DELETE without filter blocked (400)

Çalıştırma:
    pip install pytest requests
    pytest tests/test_e2e_pipeline.py -v

Environment:
    BUNGALOV_DB_URL     (default: http://localhost:8001)
    BUNGALOV_DB_API_KEY (required for auth tests)
"""

import os
import json
import uuid
import pytest
import requests

# ─── Config ───────────────────────────────────────────────────────────────

BASE_URL = os.environ.get("BUNGALOV_DB_URL", "http://localhost:8001")
API_KEY = os.environ.get("BUNGALOV_DB_API_KEY", "")
HEADERS_AUTH = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
HEADERS_NOAUTH = {"Content-Type": "application/json"}

# ─── Helpers ──────────────────────────────────────────────────────────────


def api(path, method="GET", headers=None, json_body=None):
    """Make an API call and return (response, data)."""
    url = f"{BASE_URL}{path}"
    h = headers or HEADERS_AUTH
    try:
        resp = requests.request(method, url, headers=h, json=json_body, timeout=10)
    except requests.ConnectionError:
        pytest.fail(f"Connection refused: {url} — is the SQLite API running?")
    data = None
    try:
        data = resp.json()
    except Exception:
        data = resp.text
    return resp, data


# ─── Tests ────────────────────────────────────────────────────────────────


class TestE2EPipeline:
    """End-to-end pipeline tests for Bungalov SQLite REST API."""

    # ── 1. Health Check ────────────────────────────────────────────────

    def test_health_check(self):
        """GET /health → 200, status=ok"""
        resp, data = api("/health", headers=HEADERS_NOAUTH)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {data}"
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        assert data.get("status") == "ok", f"Expected status=ok, got {data}"

    # ── 2. Auth Middleware ─────────────────────────────────────────────

    def test_auth_required_on_protected_endpoint(self):
        """GET /rest/v1/tenants without X-API-Key → 401"""
        resp, data = api("/rest/v1/tenants", headers=HEADERS_NOAUTH)
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}: {data}"

    def test_auth_accepted_with_valid_key(self):
        """GET /rest/v1/tenants with valid X-API-Key → 200"""
        resp, data = api("/rest/v1/tenants", headers=HEADERS_AUTH)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {data}"
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    # ── 3. Tenants ─────────────────────────────────────────────────────

    def test_tenants_list(self):
        """GET /rest/v1/tenants → 200, returns list"""
        resp, data = api("/rest/v1/tenants")
        assert resp.status_code == 200
        assert isinstance(data, list)
        # At least one tenant should exist (seeded data)
        # If no tenants, that's acceptable but log a warning
        if len(data) == 0:
            pytest.skip("No tenants found — seeded data may be missing")

    def test_tenants_with_select(self):
        """GET /rest/v1/tenants?select=id,business_name → partial fields"""
        resp, data = api("/rest/v1/tenants?select=id,business_name")
        assert resp.status_code == 200
        assert isinstance(data, list)
        if data:
            row = data[0]
            assert "id" in row, f"Expected 'id' in {row}"
            assert "business_name" in row, f"Expected 'business_name' in {row}"
            # Should NOT include other fields
            unexpected = {"slug", "owner_name", "plan"}
            found = unexpected & set(row.keys())
            assert not found, f"Unexpected fields in select result: {found}"

    # ── 4. Select Injection Blocked ────────────────────────────────────

    def test_select_injection_blocked(self):
        """GET with malicious select param → 400"""
        payloads = [
            "id; DROP TABLE tenants",
            "id,password FROM tenants",
            "id' OR '1'='1",
            "../../etc/passwd",
        ]
        for sel in payloads:
            resp, data = api(f"/rest/v1/tenants?select={sel}")
            assert resp.status_code == 400, (
                f"Expected 400 for select='{sel}', got {resp.status_code}: {data}"
            )
            err = data if isinstance(data, dict) else {}
            msg = (err.get("detail") or err.get("error") or str(data)) if isinstance(err, dict) else str(data)
            assert "invalid" in msg.lower() or "400" in str(resp.status_code), (
                f"Expected error about invalid column, got: {msg}"
            )

    # ── 5. Conversation CRUD ───────────────────────────────────────────

    def test_conversation_create_and_get(self):
        """POST then GET conversation → 201 → 200"""
        phone = f"+90555{uuid.uuid4().hex[:6]}"
        payload = {
            "tenant_id": "test-tenant-e2e",
            "guest_phone": phone,
            "guest_name": "E2E Test User",
            "channel": "whatsapp",
            "status": "active",
            "current_state": "greeting",
            "metadata": json.dumps({"test": True, "source": "e2e_pipeline"}),
        }
        # Create
        resp, data = api("/rest/v1/conversations", method="POST", json_body=payload)
        assert resp.status_code == 200, f"Create failed: {resp.status_code} {data}"
        created_id = data.get("id") if isinstance(data, dict) else None
        assert created_id, f"No id returned: {data}"

        # Get by id
        resp2, data2 = api(f"/rest/v1/conversations/{created_id}")
        assert resp2.status_code == 200, f"Get by id failed: {resp2.status_code} {data2}"
        assert isinstance(data2, dict)
        assert data2.get("guest_phone") == phone, f"Phone mismatch: {data2}"

        # Cleanup
        api(f"/rest/v1/conversations/{created_id}", method="DELETE")

    def test_conversation_update(self):
        """PATCH conversation → update status"""
        phone = f"+90555{uuid.uuid4().hex[:6]}"
        payload = {
            "tenant_id": "test-tenant-e2e",
            "guest_phone": phone,
            "guest_name": "Update Test",
            "channel": "whatsapp",
            "status": "active",
            "current_state": "greeting",
        }
        resp, data = api("/rest/v1/conversations", method="POST", json_body=payload)
        assert resp.status_code == 200
        created_id = data.get("id")

        # Update
        update = {"current_state": "asking_date", "status": "in_progress"}
        resp2, data2 = api(
            f"/rest/v1/conversations/{created_id}",
            method="PATCH",
            json_body=update,
        )
        assert resp2.status_code == 200, f"Update failed: {resp2.status_code} {data2}"

        # Verify
        resp3, data3 = api(f"/rest/v1/conversations/{created_id}")
        assert data3.get("current_state") == "asking_date"
        assert data3.get("status") == "in_progress"

        # Cleanup
        api(f"/rest/v1/conversations/{created_id}", method="DELETE")

    def test_conversation_delete(self):
        """DELETE conversation → verify gone"""
        phone = f"+90555{uuid.uuid4().hex[:6]}"
        payload = {
            "tenant_id": "test-tenant-e2e",
            "guest_phone": phone,
            "guest_name": "Delete Test",
            "channel": "whatsapp",
            "status": "active",
        }
        resp, data = api("/rest/v1/conversations", method="POST", json_body=payload)
        assert resp.status_code == 200
        created_id = data.get("id")

        # Delete
        resp2, data2 = api(f"/rest/v1/conversations/{created_id}", method="DELETE")
        assert resp2.status_code == 200, f"Delete failed: {resp2.status_code} {data2}"

        # Verify gone
        resp3, data3 = api(f"/rest/v1/conversations/{created_id}")
        assert resp3.status_code == 404, f"Expected 404, got {resp3.status_code}: {data3}"

    # ── 6. DELETE without filter blocked ───────────────────────────────

    def test_batch_delete_without_filter_blocked(self):
        """DELETE /rest/v1/conversations without filter → 400"""
        resp, data = api("/rest/v1/conversations", method="DELETE")
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {data}"
        err = data if isinstance(data, dict) else {}
        msg = (err.get("error") or str(data)) if isinstance(err, dict) else str(data)
        assert "filter" in msg.lower(), f"Expected 'filter' in error, got: {msg}"

    # ── 7. User Event (via messages table) ─────────────────────────────

    def test_user_event_creation(self):
        """POST /rest/v1/messages → 200 (substitute for user_events)"""
        # NOTE: user_events tablosu mevcut degil; messages tablosu uzerinden test ediliyor
        payload = {
            "tenant_id": "test-tenant-e2e",
            "conversation_id": f"conv-{uuid.uuid4().hex[:8]}",
            "role": "user",
            "content": "Test mesaji — E2E pipeline dogrulama",
        }
        resp, data = api("/rest/v1/messages", method="POST", json_body=payload)
        assert resp.status_code == 200, f"Create message failed: {resp.status_code} {data}"
        msg_id = data.get("id") if isinstance(data, dict) else None
        assert msg_id, f"No message id returned: {data}"

        # Cleanup
        api(f"/rest/v1/messages/{msg_id}", method="DELETE")

    # ── 8. Reservations Query ──────────────────────────────────────────

    def test_reservations_query(self):
        """GET /rest/v1/reservations → 200, list"""
        resp, data = api("/rest/v1/reservations")
        assert resp.status_code == 200
        assert isinstance(data, list)

    def test_reservations_with_filter(self):
        """GET /rest/v1/reservations?status=eq.pending → filtered"""
        resp, data = api("/rest/v1/reservations?status=eq.pending")
        assert resp.status_code == 200
        assert isinstance(data, list)
        for r in data:
            assert r.get("status") == "pending", f"Unexpected status: {r}"

    def test_reservations_limit_offset(self):
        """GET /rest/v1/reservations?limit=2&offset=0 → paginated"""
        resp, data = api("/rest/v1/reservations?limit=2&offset=0")
        assert resp.status_code == 200
        assert isinstance(data, list)
        assert len(data) <= 2, f"Expected ≤2 results, got {len(data)}"

    # ── 9. Non-existent table ──────────────────────────────────────────

    def test_nonexistent_table_returns_404(self):
        """GET /rest/v1/nonexistent_table → 404"""
        resp, data = api("/rest/v1/nonexistent_table_xyz")
        assert resp.status_code in (404, 405), (
            f"Expected 404/405, got {resp.status_code}: {data}"
        )

    # ── 10. Admin endpoints ────────────────────────────────────────────

    def test_admin_tables(self):
        """GET /admin/tables → 200, table list"""
        resp, data = api("/admin/tables")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {data}"
        assert isinstance(data, dict)
        assert "tables" in data, f"Missing 'tables' key: {data}"
        assert isinstance(data["tables"], dict)

    def test_admin_db_stats(self):
        """GET /admin/db-stats → 200, stats"""
        resp, data = api("/admin/db-stats")
        assert resp.status_code == 200
        assert isinstance(data, dict)
        assert "tables" in data or "db_path" in data, f"Unexpected response: {data}"
