import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/confirm-email",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/arbonus-portal-patch.js",
  "/site-icon.svg",
];

const PUBLIC_API_ROUTES = [
  "/api/auth/register",
  "/api/auth/register/precheck",
  "/api/auth/password-reset",
  "/api/auth/confirm-email/resend",
  "/api/health",
];

const PUBLIC_PREFIXES = [
  "/_next",
  "/favicon",
  "/portal-assets",
];

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    expires?: Date | number;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: boolean | "lax" | "strict" | "none";
    secure?: boolean;
    priority?: "low" | "medium" | "high";
  };
};

function isPublicRoute(pathname: string) {
  return (
    PUBLIC_ROUTES.some((route) => pathname === route) ||
    PUBLIC_API_ROUTES.some((route) => pathname === route) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname === "/robots.txt"
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicRoute(pathname)) {
    return NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    loginUrl.searchParams.set("config", "missing");
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach((cookie) => {
            request.cookies.set(cookie.name, cookie.value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach((cookie) => {
            response.cookies.set(cookie.name, cookie.value, cookie.options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  } catch (error) {
    console.error("Proxy auth check failed:", error);

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    loginUrl.searchParams.set("network", "1");
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|site-icon.svg|arbonus-portal-patch.js|portal-assets).*)",
  ],
};