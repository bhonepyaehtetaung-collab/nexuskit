import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every /admin request.
 * - Not signed in            → /admin/login
 * - Signed in but not staff  → /admin/login?error=not-staff
 * The database (RLS) enforces the same rules again, so even someone who
 * bypasses this page check still cannot read or change admin data.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const path = request.nextUrl.pathname;
  const isLoginPage = path === "/admin/login";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data } = await supabase.rpc("staff_role");
    role = typeof data === "string" ? data : null;
  }

  if (!isLoginPage && !role) {
    const url = new URL("/admin/login", request.url);
    if (user) url.searchParams.set("error", "not-staff");
    return NextResponse.redirect(url);
  }

  if (isLoginPage && role) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
