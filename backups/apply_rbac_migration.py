import subprocess, json, os, sys

ACCESS_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
API = "https://api.supabase.com/v1/projects/xzmakpsongrcbnrpdvsy/database/query"
HEADERS = {"Authorization": f"Bearer {ACCESS_TOKEN}", "Content-Type": "application/json"}

def run_sql(sql: str, label: str = ""):
    """Execute SQL via Supabase Management API"""
    print(f"\n--- {label or 'SQL'} ---")
    payload = json.dumps({"query": sql})
    r = subprocess.run(
        ["curl", "-s", API, "-H", f"Authorization: Bearer {ACCESS_TOKEN}",
         "-H", "Content-Type: application/json", "-X", "POST", "-d", payload],
        capture_output=True, text=True, timeout=30
    )
    out = r.stdout.strip()
    if out and out != "[]":
        print(out[:500])
    else:
        print("OK (empty result)")
    if out and '"message"' in out and 'error' in out.lower():
        print("ERROR detected in output!")
        return False
    return True

# Read the migration
migration_file = "/opt/hermes/resepsiyonistim/supabase/migrations/20260709_rbac.sql"
with open(migration_file) as f:
    full_sql = f.read()

# Split into logical sections
sections = full_sql.split("-- ──")

print(f"Migration file: {len(full_sql)} chars, {len(sections)} sections")

# Run section by section
for i, section in enumerate(sections):
    if not section.strip():
        continue
    label = section.split("\n")[0].strip()[:60]
    prefix = "-- ──" if i > 0 else ""
    ok = run_sql(prefix + section, f"Section {i}: {label}")
    if not ok:
        print(f"FAILED at Section {i}")
        sys.exit(1)

print("\n=== Migration completed successfully ===")
