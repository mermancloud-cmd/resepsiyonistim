#!/usr/bin/env python3
"""Export data from Supabase, import into local SQLite service."""
import os, urllib.request, json, ssl, sys

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
SQLITE_API = 'http://localhost:8000'

ctx = ssl.create_default_context()
headers = {'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY}

def fetch_table(table):
    """Fetch all rows from Supabase table."""
    rows = []
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}{table}?offset={offset}&limit={limit}"
        try:
            req = urllib.request.Request(url, headers=headers)
            resp = urllib.request.urlopen(req, context=ctx, timeout=30)
            data = json.loads(resp.read())
            if not data:
                break
            rows.extend(data)
            offset += limit
            print(f"  {table}: {len(data)} rows (total {len(rows)})", flush=True)
            if len(data) < limit:
                break
        except urllib.error.HTTPError as e:
            print(f"  {table}: HTTP {e.code} - {str(e)[:60]}", flush=True)
            break
        except Exception as e:
            print(f"  {table}: ERROR - {str(e)[:100]}", flush=True)
            break
    return rows

# Tables that exist in Supabase (from earlier check)
supabase_tables = ['tenants', 'conversations', 'reservations']

all_data = {}
for table in supabase_tables:
    print(f"\nExporting {table}...", flush=True)
    rows = fetch_table(table)
    if rows:
        all_data[table] = rows

# Handle messages -> could go to conversations or a separate handling
print(f"\nExporting messages...", flush=True)
messages = fetch_table('messages')
if messages:
    # Messages: Supabase has 'messages' table but SQLite doesn't
    # Let's include them anyway - the import endpoint will skip unmapped tables
    all_data['messages'] = messages
    print(f"  messages: {len(messages)} rows exported for reference", flush=True)

print(f"\n=== TOTAL ===")
for t, rows in all_data.items():
    print(f"  {t}: {len(rows)} rows")
print(f"\nNow importing to SQLite...", flush=True)

# POST to SQLite import endpoint
body = json.dumps(all_data)
req = urllib.request.Request(
    f"{SQLITE_API}/admin/import-all",
    data=body.encode(),
    headers={'Content-Type': 'application/json'},
    method='POST'
)
try:
    resp = urllib.request.urlopen(req, timeout=30)
    result = json.loads(resp.read())
    print(f"\n=== IMPORT RESULT ===", flush=True)
    print(json.dumps(result, indent=2, ensure_ascii=False), flush=True)
except Exception as e:
    print(f"\nIMPORT FAILED: {str(e)[:300]}", flush=True)
    sys.exit(1)
