import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/confirm-email",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

const REDIRECT_IF_AUTHENTICATED = [
  "/login",
  "/register",
  "/confirm-email",
  "/forgot-password",
];

const PUBLIC_API_ROUTES = ["/api/auth/register/precheck"];

function isPublicRoute(pathname: string) {
  return (
    PUBLIC_ROUTES.some((route) => pathname === route) ||
    PUBLIC_API_ROUTES.some((route) => pathname === route) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt"
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const pathname = request.nextUrl.pathname;
  const publicRoute = isPublicRoute(pathname);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !publicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && REDIRECT_IF_AUTHENTICATED.includes(pathname)) {
    const portalUrl = request.nextUrl.clone();
    portalUrl.pathname = "/portal";
    portalUrl.search = "";
    return NextResponse.redirect(portalUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
