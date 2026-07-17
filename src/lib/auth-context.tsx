"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantInfo {
  id: string;
  name: string | null;
  onboarding_completed: boolean;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  tenant: TenantInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthActions {
  signInWithOtp: (phone: string) => Promise<{ error: AuthError | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ data: { user: User | null; session: Session | null } | null; error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export type AuthContextValue = AuthState & AuthActions;

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch tenant info for the current user ─────────────────────────────
  const fetchTenant = useCallback(
    async (userId: string): Promise<TenantInfo | null> => {
      try {
        // Try tenants table first
        const { data: tenantRow } = await supabase
          .from("tenants")
          .select("id, name, onboarding_completed")
          .eq("owner_id", userId)
          .maybeSingle();

        if (tenantRow) {
          return {
            id: tenantRow.id,
            name: tenantRow.name ?? null,
            onboarding_completed: tenantRow.onboarding_completed ?? false,
          };
        }

        // Fallback to businesses table (legacy)
        const { data: bizRow } = await supabase
          .from("businesses")
          .select("id, name, onboarding_completed")
          .eq("owner_id", userId)
          .maybeSingle();

        if (bizRow) {
          return {
            id: bizRow.id,
            name: bizRow.name ?? null,
            onboarding_completed: bizRow.onboarding_completed ?? false,
          };
        }

        return null;
      } catch {
        return null;
      }
    },
    [supabase]
  );

  // ── Initialize session + listen for auth changes ──────────────────────
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          const tenantInfo = await fetchTenant(initialSession.user.id);
          if (mounted) setTenant(tenantInfo);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to initialize session");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const tenantInfo = await fetchTenant(newSession.user.id);
        if (mounted) setTenant(tenantInfo);
      } else {
        setTenant(null);
      }

      // Handle email verification — user clicked confirmation link
      if (event === "USER_UPDATED" && newSession?.user?.email_confirmed_at) {
        router.push("/login?reason=verified");
      }

      // Navigate on sign-in/sign-out
      if (event === "SIGNED_IN" && newSession) {
        router.push("/dashboard");
      } else if (event === "SIGNED_OUT") {
        router.push("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchTenant, router]);

  // ── Auth Actions ──────────────────────────────────────────────────────

  const signInWithOtp = useCallback(
    async (phone: string) => {
      setError(null);
      const fullPhone = phone.startsWith("+") ? phone : `+90${phone}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) setError(error.message);
      return { error };
    },
    [supabase]
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      return { error };
    },
    [supabase]
  );

  const signInWithMagicLink = useCallback(
    async (email: string) => {
      setError(null);
      const redirectTo = `${window.location.origin}/login?reason=magic_link`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) setError(error.message);
      return { error };
    },
    [supabase]
  );

  const verifyOtp = useCallback(
    async (phone: string, token: string) => {
      setError(null);
      const fullPhone = phone.startsWith("+") ? phone : `+90${phone}`;
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token,
        type: "sms",
      });
      if (error) setError(error.message);
      return { error };
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string, metadata?: Record<string, unknown>) => {
      setError(null);
      const redirectTo = `${window.location.origin}/login?reason=signed_up`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: redirectTo,
        },
      });
      if (error) setError(error.message);
      return { data, error };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Proceed even if signOut fails
    }

    // Clear auth cookies client-side
    const authCookies = ["sb-access-token", "sb-refresh-token", "__csrf_token"];
    authCookies.forEach((name) => {
      document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    });

    setSession(null);
    setUser(null);
    setTenant(null);
    router.push("/login");
  }, [supabase, router]);

  const refreshSession = useCallback(async () => {
    const {
      data: { session: refreshed },
    } = await supabase.auth.getSession();
    setSession(refreshed);
    setUser(refreshed?.user ?? null);
    if (refreshed?.user) {
      const tenantInfo = await fetchTenant(refreshed.user.id);
      setTenant(tenantInfo);
    }
  }, [supabase, fetchTenant]);

  // ── Value ─────────────────────────────────────────────────────────────

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      tenant,
      isLoading,
      isAuthenticated: !!user,
      error,
      signInWithOtp,
      signInWithEmail,
      signInWithMagicLink,
      verifyOtp,
      signUp,
      signOut,
      refreshSession,
    }),
    [
      user,
      session,
      tenant,
      isLoading,
      error,
      signInWithOtp,
      signInWithEmail,
      signInWithMagicLink,
      verifyOtp,
      signUp,
      signOut,
      refreshSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
