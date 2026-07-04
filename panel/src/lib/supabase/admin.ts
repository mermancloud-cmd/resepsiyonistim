import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Admin Supabase client — uses service_role key.
 * ONLY use in API routes / server-side code.
 * NEVER expose to the client (no NEXT_PUBLIC_ prefix).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Default tenant ID for single-tenant setup
const DEFAULT_TENANT_ID = "596ce2d7-4ac4-4bc3-aff6-fa18b4bfd999";

/**
 * Extract tenant_id from the authenticated session.
 * Falls back to default tenant for single-tenant deployments.
 */
export async function getTenantIdFromSession(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // No-op in API routes
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEFAULT_TENANT_ID;

    // Look up tenant from user metadata or tenants table
    const { data: tenant } = await createAdminClient()
      .from("tenants")
      .select("id")
      .limit(1)
      .single();

    return tenant?.id ?? DEFAULT_TENANT_ID;
  } catch {
    return DEFAULT_TENANT_ID;
  }
}
