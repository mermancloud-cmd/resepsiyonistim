/**
 * Tenant-Scoped Supabase Client
 *
 * Provides helpers that automatically scope queries to the current
 * authenticated user's tenant. This ensures each owner only sees
 * their own properties, reservations, and conversations.
 *
 * Architecture:
 * - Client-side: Uses Supabase RLS (Row Level Security) policies
 *   that check `auth.uid()` against the `owner_id` column
 * - Server-side: Uses the `authenticateRequest()` function from
 *   `auth-jwt.ts` to verify JWT and extract `tenant_id`
 *
 * Usage in hooks:
 * ```ts
 * import { useAuth } from "@/lib/auth-context";
 * import { createTenantClient } from "@/lib/tenant-client";
 *
 * const { user } = useAuth();
 * const supabase = createTenantClient();
 * const { data } = await supabase
 *   .from("reservations")
 *   .select("*")
 *   .eq("tenant_id", tenantId); // Always scope to tenant
 * ```
 */

import { createClient } from "@/lib/supabase/client";
import type { PostgrestQueryBuilder } from "@supabase/supabase-js";

// ─── Tables that are tenant-scoped ────────────────────────────────────────────

/**
 * List of tables that have a `tenant_id` column and should be
 * automatically scoped to the current tenant.
 */
export const TENANT_SCOPED_TABLES = [
  "properties",
  "reservations",
  "conversations",
  "messages",
  "payments",
  "payment_confirmations",
  "ibans",
  "owner_ibans",
  "ai_settings",
  "push_subscriptions",
  "analytics_events",
  "guest_satisfaction_surveys",
] as const;

export type TenantScopedTable = (typeof TENANT_SCOPED_TABLES)[number];

// ─── Scoped Query Builder ────────────────────────────────────────────────────

/**
 * Create a Supabase client that automatically scopes queries to a tenant.
 * This is a wrapper around the standard browser client that adds
 * tenant_id filtering to all queries on tenant-scoped tables.
 *
 * @param tenantId - The tenant UUID to scope queries to
 */
export function createScopedClient(tenantId: string) {
  const supabase = createClient();

  return {
    /**
     * Query a tenant-scoped table. Automatically adds `.eq("tenant_id", tenantId)`.
     */
    scoped: <T extends TenantScopedTable>(table: T) => {
      return supabase.from(table).select("*").eq("tenant_id", tenantId);
    },

    /**
     * Get raw Supabase client (use for non-tenant-scoped tables like auth, tenants)
     */
    raw: supabase,

    /**
     * Insert into a tenant-scoped table. Automatically adds tenant_id.
     */
    insert: <T extends TenantScopedTable>(
      table: T,
      values: Record<string, unknown> | Record<string, unknown>[]
    ) => {
      const records = Array.isArray(values) ? values : [values];
      const withTenant = records.map((r) => ({ ...r, tenant_id: tenantId }));
      return supabase.from(table).insert(withTenant);
    },

    /**
     * Update a tenant-scoped table. Automatically adds tenant_id filter.
     */
    update: <T extends TenantScopedTable>(
      table: T,
      values: Record<string, unknown>,
      matchConditions: Record<string, unknown> = {}
    ) => {
      return supabase
        .from(table)
        .update(values)
        .match({ ...matchConditions, tenant_id: tenantId });
    },

    /**
     * Delete from a tenant-scoped table. Automatically adds tenant_id filter.
     */
    delete: <T extends TenantScopedTable>(
      table: T,
      matchConditions: Record<string, unknown>
    ) => {
      return supabase
        .from(table)
        .delete()
        .match({ ...matchConditions, tenant_id: tenantId });
    },
  };
}

// ─── Hook: useTenantClient ───────────────────────────────────────────────────

/**
 * React hook that returns a tenant-scoped Supabase client.
 * Must be used within an AuthProvider.
 *
 * @example
 * ```tsx
 * function ReservationList() {
 *   const { client, tenantId, isLoading } = useTenantClient();
 *   // Use client.scoped("reservations") to get tenant-filtered data
 * }
 * ```
 */
export function useTenantClient() {
  // This is imported lazily to avoid circular dependency
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuth } = require("@/lib/auth-context") as typeof import("@/lib/auth-context");
  const { tenant, isLoading } = useAuth();

  if (isLoading) {
    return { client: null, tenantId: null, isLoading: true };
  }

  if (!tenant) {
    return { client: null, tenantId: null, isLoading: false };
  }

  return {
    client: createScopedClient(tenant.id),
    tenantId: tenant.id,
    isLoading: false,
  };
}
