import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Gracefully handle missing env vars (dev mode without Supabase)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          // Harden cookie flags: HttpOnly, Secure, SameSite
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: options.path ?? "/",
            })
          );
        },
      },
    }
  );

  // Refresh the auth session.
  // Calling getUser() is important — it also validates the JWT.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users on protected routes
  const publicPrefixPaths = ["/login", "/auth", "/_next", "/favicon", "/manifest", "/api/health", "/signup", "/blog", "/referral", "/widget"];
  const exactPublicPaths = ["/"]; // landing page — exact match only
  const isPublicPath =
    publicPrefixPaths.some((p) => request.nextUrl.pathname.startsWith(p)) ||
    exactPublicPaths.includes(request.nextUrl.pathname);

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
