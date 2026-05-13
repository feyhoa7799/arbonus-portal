import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { ensurePortalAccountFromUser } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  const baseUrl = siteUrl || request.nextUrl.origin;
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const next = url.searchParams.get("next") || "/portal";

    const supabase = await getServerSupabase();

    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error("exchangeCodeForSession failed:", exchangeError);
        return NextResponse.redirect(new URL("/login", baseUrl));
      }
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      if (userError) {
        console.error("auth callback getUser failed:", userError);
      }
      return NextResponse.redirect(new URL("/login", baseUrl));
    }

    const ensured = await ensurePortalAccountFromUser(user);

    if (!ensured.ok) {
      return NextResponse.redirect(new URL("/login?blocked=1", baseUrl));
    }

    const redirectTo = next === "/portal" ? "/login?confirmed=1" : next;

    return NextResponse.redirect(new URL(redirectTo, baseUrl));
  } catch (error) {
    console.error("auth callback route failed:", error);
    return NextResponse.redirect(new URL("/login", baseUrl));
  }
}