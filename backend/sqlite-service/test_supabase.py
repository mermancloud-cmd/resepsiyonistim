#!/usr/bin/env python3
import os, urllib.request, json, ssl

url = os.environ.get('SUPABASE_URL', '')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
db_url = os.environ.get('SUPABASE_DB_URL', '')

print("=== SUPABASE ENV ===")
print("URL OK" if url else "URL YOK")
print("KEY OK - length=" + str(len(key)) if key else "KEY YOK")
print("DB_URL OK" if db_url else "DB_URL YOK")

# Test REST API
ctx = ssl.create_default_context()
headers = {
    'apikey': key,
    'Authorization': 'Bearer ' + key
}
try:
    req = urllib.request.Request(url + "tenants?limit=3", headers=headers)
    resp = urllib.request.urlopen(req, context=ctx, timeout=10)
    data = json.loads(resp.read())
    print("\n=== CONNECTION SUCCESS ===")
    print("Tenants count:", len(data))
    for t in data:
        print("  -", t.get('id', '?'), ":", t.get('guest_name', '?'))
except Exception as e:
    print("\n=== CONNECTION FAILED ===")
    print(str(e)[:300])
