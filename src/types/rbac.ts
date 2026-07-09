// ─── RBAC Types ───────────────────────────────────────────────────────────────
// Role-based access control type definitions for the owner panel.

/** System role names */
export type UserRole = "admin" | "staff" | "owner";

/** Permission action verbs */
export type PermissionAction = "read" | "write" | "approve" | "handoff" | "export";

/** Resource domains in the permission matrix */
export type PermissionResource =
  | "reservations"
  | "chat"
  | "guests"
  | "rooms"
  | "analytics"
  | "settings"
  | "finance"
  | "ai"
  | "team";

/** Wildcard matching all resources and actions */
export type WildcardPermission = "*::*";

/**
 * Permission matrix structure.
 * Example:
 * {
 *   "reservations": { "read": true, "write": true, "approve": false },
 *   "chat": { "read": true, "write": true, "handoff": true },
 *   "*::*": true  // admin wildcard
 * }
 */
export type PermissionMatrix = {
  [K in PermissionResource]?: Partial<Record<PermissionAction, boolean>>;
} & {
  "*::*"?: boolean;
};

/** Role record from the public.roles table */
export interface Role {
  id: string;
  name: UserRole;
  description: string | null;
  permissions: PermissionMatrix;
  is_system: boolean;
  created_at: string;
}

/** User-role assignment from public.user_roles table */
export interface UserRoleAssignment {
  id: string;
  user_id: string;
  tenant_id: string;
  role_id: string;
  created_by: string | null;
  created_at: string;
  /** Joined fields */
  role?: Role;
  user_name?: string;
  user_email?: string;
}

/** RBAC context available throughout the app */
export interface RBACContext {
  role: UserRole | null;
  permissions: PermissionMatrix | null;
  isAdmin: boolean;
  isOwner: boolean;
  isStaff: boolean;
  /** Check if user has a specific permission */
  can: (resource: PermissionResource, action: PermissionAction) => boolean;
  /** Check if user has any of the specified roles */
  hasRole: (...roles: UserRole[]) => boolean;
}

/** Helper constant: permission matrix for each role */
export const ROLE_PERMISSIONS: Record<UserRole, PermissionMatrix> = {
  admin: { "*::*": true },
  staff: {
    reservations: { read: true, write: true, approve: false },
    chat: { read: true, write: true, handoff: true },
    guests: { read: true, write: false },
    rooms: { read: true, write: false },
    analytics: { read: true, export: false },
    ai: { read: true, write: false },
    settings: { read: false, write: false },
    finance: { read: false, export: false },
    team: { read: false, write: false },
  },
  owner: {
    reservations: { read: true, write: true, approve: true },
    chat: { read: true, write: true, handoff: true },
    guests: { read: true, write: true },
    rooms: { read: true, write: true },
    analytics: { read: true, export: true },
    settings: { read: true, write: true },
    finance: { read: true, export: true },
    ai: { read: true, write: true },
    team: { read: true, write: true },
  },
};

/** Page-level access requirement */
export interface PageAccessRequirement {
  /** Required role (lowest) */
  minRole?: UserRole;
  /** Required specific permission */
  permission?: `${PermissionResource}.${PermissionAction}`;
  /** Redirect path if not authorized */
  redirectTo?: string;
}

/** Route access configuration */
export const ROUTE_ACCESS: Record<string, PageAccessRequirement> = {
  "/dashboard": { minRole: "staff" },
  "/messages": { permission: "chat.read" },
  "/reservations": { permission: "reservations.read" },
  "/rooms": { permission: "rooms.read" },
  "/settings": { permission: "settings.read" },
  "/settings/team": { permission: "team.write" },
  "/ai": { permission: "ai.read" },
  "/analytics": { permission: "analytics.read" },
  "/payments": { permission: "finance.read" },
  "/subscription": { permission: "finance.read" },
  "/referral": { permission: "settings.read" },
  "/ab-test": { permission: "ai.write" },
};
