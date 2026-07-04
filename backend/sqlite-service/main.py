"""
Bungalov SQLite REST API - Full Supabase-compatible replacement
Provides dynamic REST endpoints for all Supabase tables.
"""
import json
import sqlite3
import os
import uuid
import re
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import uvicorn

DB_PATH = os.environ.get("DB_PATH", "/data/bungalov.db")
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))

# Track seen routes to avoid duplicate registrations on reload
_registered_tables = set()


def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=10000")
    return conn


def init_db():
    """Create all Supabase-compatible tables."""
    conn = get_db()
    c = conn.cursor()

    # ─── conversations ──────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY, tenant_id TEXT, guest_phone TEXT, guest_name TEXT,
        channel TEXT, status TEXT, current_state TEXT, assigned_agent TEXT,
        consecutive_failures INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        started_at TEXT, last_message_at TEXT, closed_at TEXT,
        last_customer_message_at TEXT, last_ai_message_at TEXT,
        message_count INTEGER DEFAULT 0,
        reservation_stage TEXT, collected_fields TEXT, missing_fields TEXT,
        is_ready_for_quote INTEGER DEFAULT 0,
        collected_data TEXT DEFAULT '{}'
    )""")

    # ─── reservations ───────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY, tenant_id TEXT, lead_id TEXT, conversation_id TEXT,
        room_id TEXT, booking_reference TEXT,
        check_in_date TEXT, check_out_date TEXT,
        nights INTEGER DEFAULT 0, adults INTEGER DEFAULT 1, children INTEGER DEFAULT 0,
        total_price REAL DEFAULT 0, deposit_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending', special_requests TEXT,
        created_at TEXT, confirmed_at TEXT, cancelled_at TEXT, cancellation_reason TEXT,
        guest_name TEXT, guest_phone TEXT, room_name TEXT
    )""")

    # ─── rooms ──────────────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY, tenant_id TEXT, name TEXT, type TEXT,
        capacity_adults INTEGER DEFAULT 2, capacity_children INTEGER DEFAULT 0,
        description TEXT, amenities TEXT DEFAULT '[]',
        photo_urls TEXT DEFAULT '[]',
        is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0,
        created_at TEXT, updated_at TEXT,
        bungalow_id TEXT, base_price TEXT
    )""")

    # ─── bungalows ──────────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS bungalows (
        id TEXT PRIMARY KEY, tenant_id TEXT, name TEXT, description TEXT,
        location TEXT, address TEXT, latitude REAL, longitude REAL,
        photo_urls TEXT DEFAULT '[]', amenities TEXT DEFAULT '[]',
        status TEXT DEFAULT 'active', sort_order INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        created_at TEXT, updated_at TEXT,
        business_type TEXT, onboarding_completed INTEGER DEFAULT 0,
        onboarding_progress TEXT, onboarding_started_at TEXT, onboarding_completed_at TEXT
    )""")

    # ─── webhook_failures ───────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS webhook_failures (
        id TEXT PRIMARY KEY, webhook_url TEXT, payload TEXT DEFAULT '{}',
        headers TEXT DEFAULT '{}', original_status_code TEXT,
        error_message TEXT, retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3, consecutive_failures INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending', next_retry_at TEXT,
        created_at TEXT, updated_at TEXT,
        delivered_at TEXT, source_workflow TEXT, source_execution_id TEXT,
        tenant_id TEXT, workflow_name TEXT, original_payload TEXT DEFAULT '{}',
        response_status TEXT, response_body TEXT, last_attempt_at TEXT,
        resolved_at TEXT, error_type TEXT, source TEXT
    )""")

    # ─── tenants ────────────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY, slug TEXT, business_name TEXT,
        owner_name TEXT, owner_email TEXT, owner_phone TEXT,
        plan TEXT DEFAULT 'free', is_active INTEGER DEFAULT 1,
        timezone TEXT DEFAULT 'Europe/Istanbul', locale TEXT DEFAULT 'tr',
        created_at TEXT, updated_at TEXT,
        onboarding_completed_at TEXT
    )""")

    # ─── messages ───────────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, conversation_id TEXT, tenant_id TEXT,
        role TEXT, content TEXT, whatsapp_message_id TEXT,
        tokens_used INTEGER, sent_at TEXT
    )""")

    # ─── room_pricing ───────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS room_pricing (
        id TEXT PRIMARY KEY, room_id TEXT, tenant_id TEXT, label TEXT,
        price_per_night REAL DEFAULT 0,
        valid_from TEXT, valid_until TEXT,
        priority INTEGER DEFAULT 0, created_at TEXT,
        day_of_week TEXT, min_nights INTEGER DEFAULT 1,
        updated_at TEXT
    )""")

    # ─── faqs ───────────────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS faqs (
        id TEXT PRIMARY KEY, tenant_id TEXT,
        question TEXT, answer TEXT, category TEXT,
        is_active INTEGER DEFAULT 1, priority INTEGER DEFAULT 0,
        created_at TEXT, updated_at TEXT
    )""")

    # ─── tenant_settings ────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS tenant_settings (
        id TEXT PRIMARY KEY, tenant_id TEXT,
        ai_persona_name TEXT, ai_persona_description TEXT,
        business_description TEXT,
        check_in_time TEXT DEFAULT '14:00', check_out_time TEXT DEFAULT '11:00',
        min_stay_nights INTEGER DEFAULT 1,
        max_advance_booking_days INTEGER DEFAULT 365,
        currency TEXT DEFAULT 'TRY', deposit_percentage INTEGER DEFAULT 30,
        cancellation_policy TEXT, business_hours_start TEXT,
        business_hours_end TEXT, out_of_hours_message TEXT,
        handoff_trigger_phrases TEXT DEFAULT '[]',
        auto_handoff_after_failures INTEGER DEFAULT 3,
        claude_model TEXT, max_conversation_turns INTEGER DEFAULT 50,
        updated_at TEXT,
        openai_model TEXT,
        notification_channel TEXT DEFAULT 'telegram',
        owner_telegram_chat_id TEXT, owner_whatsapp_phone TEXT,
        notification_enabled INTEGER DEFAULT 1,
        locale TEXT DEFAULT 'tr',
        created_at TEXT
    )""")

    # ─── notification_logs ──────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS notification_logs (
        id TEXT PRIMARY KEY, tenant_id TEXT,
        event_type TEXT, channel TEXT DEFAULT 'telegram',
        recipient TEXT, message TEXT,
        status TEXT DEFAULT 'pending',
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
    )""")

    # ─── owner_settings ─────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS owner_settings (
        id TEXT PRIMARY KEY, tenant_id TEXT,
        setting_key TEXT, setting_value TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )""")

    # ─── otp_codes ──────────────────────────────────────────────
    c.execute("""CREATE TABLE IF NOT EXISTS otp_codes (
        id TEXT PRIMARY KEY, phone_number TEXT, code TEXT,
        purpose TEXT DEFAULT 'login', expires_at TEXT,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    )""")

    conn.commit()
    conn.close()


def migrate_schema():
    """Migrate existing tables to match current schema."""
    conn = get_db()
    c = conn.cursor()
    
    # Get actual table columns
    existing_cols = {}
    for table in ALLOWED_TABLES:
        try:
            rows = c.execute(f"PRAGMA table_info(\"{table}\")").fetchall()
            existing_cols[table] = {r["name"] for r in rows}
        except sqlite3.OperationalError:
            existing_cols[table] = set()
    
    # Target columns per table (from new schema above)
    target_cols = {
        "conversations": ["id","tenant_id","guest_phone","guest_name","channel","status","current_state","assigned_agent","consecutive_failures","metadata","started_at","last_message_at","closed_at","last_customer_message_at","last_ai_message_at","message_count","reservation_stage","collected_fields","missing_fields","is_ready_for_quote","collected_data"],
        "reservations": ["id","tenant_id","lead_id","conversation_id","room_id","booking_reference","check_in_date","check_out_date","nights","adults","children","total_price","deposit_amount","status","special_requests","created_at","confirmed_at","cancelled_at","cancellation_reason","guest_name","guest_phone","room_name"],
        "rooms": ["id","tenant_id","name","type","capacity_adults","capacity_children","description","amenities","photo_urls","is_active","sort_order","created_at","updated_at","bungalow_id","base_price"],
        "bungalows": ["id","tenant_id","name","description","location","address","latitude","longitude","photo_urls","amenities","status","sort_order","metadata","created_at","updated_at","business_type","onboarding_completed","onboarding_progress","onboarding_started_at","onboarding_completed_at"],
        "webhook_failures": ["id","webhook_url","payload","headers","original_status_code","error_message","retry_count","max_retries","consecutive_failures","status","next_retry_at","created_at","updated_at","delivered_at","source_workflow","source_execution_id","tenant_id","workflow_name","original_payload","response_status","response_body","last_attempt_at","resolved_at","error_type","source"],
        "tenants": ["id","slug","business_name","owner_name","owner_email","owner_phone","plan","is_active","timezone","locale","created_at","updated_at","onboarding_completed_at"],
        "room_pricing": ["id","room_id","tenant_id","label","price_per_night","valid_from","valid_until","priority","created_at","day_of_week","min_nights","updated_at"],
        "faqs": ["id","tenant_id","question","answer","category","is_active","priority","created_at","updated_at"],
        "tenant_settings": ["id","tenant_id","ai_persona_name","ai_persona_description","business_description","check_in_time","check_out_time","min_stay_nights","max_advance_booking_days","currency","deposit_percentage","cancellation_policy","business_hours_start","business_hours_end","out_of_hours_message","handoff_trigger_phrases","auto_handoff_after_failures","claude_model","max_conversation_turns","updated_at","openai_model","notification_channel","owner_telegram_chat_id","owner_whatsapp_phone","notification_enabled","locale","created_at"],
    }
    
    for table, expected in target_cols.items():
        actual = existing_cols.get(table, set())
        missing = [c for c in expected if c not in actual]
        if missing:
            print(f"  {table}: adding {len(missing)} missing columns: {missing}")
            for col_name in missing:
                try:
                    c.execute(f"ALTER TABLE \"{table}\" ADD COLUMN \"{col_name}\" TEXT")
                except sqlite3.OperationalError:
                    pass  # column already exists
    
    conn.commit()
    conn.close()


# ─── Utility functions ───────────────────────────────────────

ALLOWED_TABLES = {
    "conversations", "reservations", "rooms", "bungalows",
    "webhook_failures", "tenants", "room_pricing", "faqs",
    "tenant_settings", "notification_logs", "owner_settings", "otp_codes",
    "messages",
    # n8n workflow tables
    "error_logs", "escalation_triggers", "execution_logs",
    "follow_up_history", "guest_satisfaction", "handoff_status",
    "owner_notifications", "tenant_whatsapp_instances",
    "iyzico_config", "iyzico_subscriptions", "tenant_subscriptions",
    "business_profiles",
}


def parse_supabase_filter(q: str):
    parts = q.split("=", 1)
    if len(parts) != 2:
        return parts[0], "eq", ""
    field, value_part = parts
    operators = ["neq", "gte", "gt", "lte", "lt", "eq", "like", "ilike", "in"]
    for op in operators:
        if value_part.startswith(op + "."):
            return field, op, value_part[len(op) + 1:]
    return field, "eq", value_part


def build_where_clause(params: dict):
    from urllib.parse import unquote
    conditions, values = [], []
    for key, val in params.items():
        if key in ("select", "limit", "offset", "order"):
            continue
        field, op, raw_val = parse_supabase_filter(f"{key}={val}")
        raw_val = unquote(raw_val)
        if op == "eq":
            conditions.append(f'"{field}" = ?')
            values.append(raw_val)
        elif op == "neq":
            conditions.append(f'"{field}" != ?')
            values.append(raw_val)
        elif op == "gt":
            conditions.append(f'"{field}" > ?')
            values.append(raw_val)
        elif op == "gte":
            conditions.append(f'"{field}" >= ?')
            values.append(raw_val)
        elif op == "lt":
            conditions.append(f'"{field}" < ?')
            values.append(raw_val)
        elif op == "lte":
            conditions.append(f'"{field}" <= ?')
            values.append(raw_val)
        elif op == "like":
            conditions.append(f'"{field}" LIKE ?')
            values.append(raw_val.replace("*", "%"))
        elif op == "ilike":
            conditions.append(f'LOWER("{field}") LIKE ?')
            values.append(raw_val.replace("*", "%").lower())
        elif op == "in":
            items = [x.strip().strip("'\"") for x in raw_val.split(",") if x.strip()]
            if items:
                placeholders = ",".join(["?" for _ in items])
                conditions.append(f'"{field}" IN ({placeholders})')
                values.extend(items)
    if conditions:
        return " WHERE " + " AND ".join(conditions), values
    return "", []


def row_to_dict(row):
    d = dict(row)
    for f in list(d.keys()):
        v = d[f]
        if isinstance(v, str):
            if f in ("metadata", "collected_data", "amenities", "photo_urls",
                     "payload", "headers", "original_payload", "handoff_trigger_phrases",
                     "collected_fields", "missing_fields", "language_history"):
                try:
                    d[f] = json.loads(v)
                except (json.JSONDecodeError, TypeError):
                    pass
    for f in ("is_active", "human_handoff_active", "ai_enabled",
              "used", "is_ready_for_quote", "notification_enabled",
              "onboarding_completed"):
        if f in d:
            d[f] = bool(d[f]) if isinstance(d[f], int) else d[f]
    return d


# ─── FastAPI App ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    migrate_schema()
    yield


app = FastAPI(title="Bungalov SQLite API", version="2.1.0", lifespan=lifespan)
API_KEY = os.environ.get("BUNGALOV_DB_API_KEY", "")

# ─── Auth Middleware ────────────────────────────────
if API_KEY:
    @app.middleware("http")
    async def require_api_key(request: Request, call_next):
        if request.url.path in ("/health", "/docs", "/openapi.json"):
            return await call_next(request)
        auth_header = request.headers.get("X-API-Key", "")
        if auth_header != API_KEY:
            return JSONResponse(status_code=401, content={"error": "unauthorized"})
        return await call_next(request)


def validate_select_param(sel: str) -> str:
    """Only allow safe column names or *."""
    if sel == "*":
        return sel
    parts = [p.strip() for p in sel.split(",") if p.strip()]
    if not parts:
        raise HTTPException(status_code=400, detail="Invalid select parameter")
    for p in parts:
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', p):
            raise HTTPException(status_code=400, detail=f"Invalid column name: {p}")
    return ", ".join(parts)


@app.get("/health")
def health():
    return {"status": "ok", "db": DB_PATH, "time": datetime.now(timezone.utc).isoformat()}


# ─── Dynamic table endpoints ─────────────────────────────────

def register_dynamic_routes():
    for table in ALLOWED_TABLES:
        if table in _registered_tables:
            continue
        _register_table(table)
        _registered_tables.add(table)


def _register_table(table: str):

    @app.get(f"/rest/v1/{table}")
    def list_rows(request: Request):
        params = dict(request.query_params)
        raw_sel = params.pop("select", "*")
        sel = validate_select_param(raw_sel)
        limit = params.pop("limit", None)
        offset = params.pop("offset", None)
        order = params.pop("order", None)

        where_clause, values = build_where_clause(params)
        query = f'SELECT {sel} FROM "{table}"{where_clause}'
        if order and re.match(r'^[\w\s.,]+$', order):
            query += f" ORDER BY {order}"
        if limit:
            query += f" LIMIT {int(limit)}"
        if offset:
            query += f" OFFSET {int(offset)}"

        conn = get_db()
        try:
            rows = conn.execute(query, values).fetchall()
        except sqlite3.OperationalError as e:
            conn.close()
            return JSONResponse(status_code=400, content={"error": str(e)})
        conn.close()
        return [row_to_dict(r) for r in rows]

    @app.get(f"/rest/v1/{table}/{{row_id}}")
    def get_row(row_id: str):
        conn = get_db()
        row = conn.execute(f'SELECT * FROM "{table}" WHERE id = ?', (row_id,)).fetchone()
        conn.close()
        if not row:
            return JSONResponse(status_code=404, content={"error": "Not found"})
        return row_to_dict(row)

    @app.post(f"/rest/v1/{table}")
    def create_row(body: dict, request: Request):
        if not body:
            return JSONResponse(status_code=400, content={"error": "Empty body"})
        conn = get_db()
        row_id = body.get("id", str(uuid.uuid4()))
        body["id"] = row_id

        cols = []
        vals = []
        placeholders = []
        for k, v in body.items():
            cols.append(f'"{k}"')
            placeholders.append("?")
            if isinstance(v, (dict, list)):
                vals.append(json.dumps(v, ensure_ascii=False))
            elif isinstance(v, bool):
                vals.append(1 if v else 0)
            else:
                vals.append(v)

        try:
            conn.execute(
                f'INSERT INTO "{table}" ({", ".join(cols)}) VALUES ({", ".join(placeholders)})',
                vals
            )
            conn.commit()
        except sqlite3.OperationalError as e:
            conn.close()
            return JSONResponse(status_code=400, content={"error": str(e)})
        conn.close()
        return {"id": row_id, "message": "created"}

    @app.patch(f"/rest/v1/{table}")
    def update_rows(body: dict, request: Request):
        params = dict(request.query_params)
        where_clause, values = build_where_clause(params)
        if not where_clause:
            return JSONResponse(status_code=400, content={"error": "No filter provided"})
        if not body:
            return JSONResponse(status_code=400, content={"error": "Empty body"})

        update_fields, update_values = [], []
        for k, v in body.items():
            update_fields.append(f'"{k}" = ?')
            if isinstance(v, (dict, list)):
                update_values.append(json.dumps(v, ensure_ascii=False))
            elif isinstance(v, bool):
                update_values.append(1 if v else 0)
            else:
                update_values.append(v)

        query = f'UPDATE "{table}" SET {", ".join(update_fields)}{where_clause}'
        conn = get_db()
        try:
            conn.execute(query, update_values + values)
            conn.commit()
            affected = conn.total_changes
        except sqlite3.OperationalError as e:
            conn.close()
            return JSONResponse(status_code=400, content={"error": str(e)})
        conn.close()
        return {"message": "updated", "affected": affected}

    @app.patch(f"/rest/v1/{table}/{{row_id}}")
    def update_row(row_id: str, body: dict):
        if not body:
            return JSONResponse(status_code=400, content={"error": "Empty body"})
        update_fields, update_values = [], []
        for k, v in body.items():
            update_fields.append(f'"{k}" = ?')
            if isinstance(v, (dict, list)):
                update_values.append(json.dumps(v, ensure_ascii=False))
            elif isinstance(v, bool):
                update_values.append(1 if v else 0)
            else:
                update_values.append(v)
        update_values.append(row_id)

        conn = get_db()
        try:
            conn.execute(
                f'UPDATE "{table}" SET {", ".join(update_fields)} WHERE "id" = ?',
                update_values
            )
            conn.commit()
        except sqlite3.OperationalError as e:
            conn.close()
            return JSONResponse(status_code=400, content={"error": str(e)})
        conn.close()
        return {"message": "updated"}

    @app.delete(f"/rest/v1/{table}/{{row_id}}")
    def delete_row(row_id: str):
        conn = get_db()
        conn.execute(f'DELETE FROM "{table}" WHERE id = ?', (row_id,))
        conn.commit()
        conn.close()
        return {"deleted": 1}

    @app.delete(f"/rest/v1/{table}")
    def delete_rows(request: Request):
        params = dict(request.query_params)
        where_clause, values = build_where_clause(params)
        if not where_clause:
            return JSONResponse(status_code=400, content={"error": "Filter required for batch delete"})
        conn = get_db()
        conn.execute(f'DELETE FROM "{table}"{where_clause}', values)
        conn.commit()
        conn.close()
        return {"deleted": 1}


register_dynamic_routes()


# ─── Admin endpoints ─────────────────────────────────────────

@app.get("/admin/tables")
def list_tables():
    conn = get_db()
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()
    count = {}
    for r in rows:
        t = r["name"]
        if not t.startswith("sqlite_"):
            try:
                c = conn.execute(f"SELECT COUNT(*) FROM \"{t}\"").fetchone()[0]
                count[t] = c
            except Exception:
                count[t] = 0
    conn.close()
    return {"tables": count}


@app.get("/admin/db-stats")
def db_stats():
    conn = get_db()
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()
    stats = {}
    for r in rows:
        t = r["name"]
        try:
            c = conn.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
            stats[t] = c
        except Exception:
            stats[t] = 0
    conn.close()
    return {
        "db_path": DB_PATH,
        "tables": stats,
        "time": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/admin/import-all")
def import_all(data: dict):
    """Bulk import data into all tables in one transaction."""
    conn = get_db()
    c = conn.cursor()
    results = {}
    for table_name, rows in data.items():
        if table_name not in ALLOWED_TABLES:
            results[table_name] = {"error": "not allowed"}
            continue
        if not isinstance(rows, list) or not rows:
            results[table_name] = {"rows": 0, "imported": 0}
            continue
        imported = 0
        errors = 0
        for row in rows:
            clean = {}
            for k, v in row.items():
                if v is None:
                    continue
                if isinstance(v, (dict, list)):
                    clean[k] = json.dumps(v, ensure_ascii=False)
                elif isinstance(v, bool):
                    clean[k] = 1 if v else 0
                else:
                    clean[k] = v
            if not clean:
                errors += 1
                continue
            row_id = clean.get("id", str(uuid.uuid4()))
            clean["id"] = row_id
            cols = [f'"{k}"' for k in clean.keys()]
            ph = ["?" for _ in clean]
            vals = list(clean.values())
            try:
                c.execute(
                    f'INSERT OR REPLACE INTO "{table_name}" ({", ".join(cols)}) VALUES ({", ".join(ph)})',
                    vals
                )
                imported += 1
            except sqlite3.OperationalError as e:
                errors += 1
        conn.commit()
        results[table_name] = {"rows": len(rows), "imported": imported, "errors": errors}
    conn.close()
    return {"message": "Import complete", "results": results}


if __name__ == "__main__":
    uvicorn.run("main:app", host=HOST, port=PORT, reload=False)
