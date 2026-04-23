import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { ensurePortalAccountFromUser } from "@/lib/auth-guards";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const next = url.searchParams.get("next") || "/portal";

    const supabase = await getServerSupabase();

    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error("exchangeCodeForSession failed:", exchangeError);
        return NextResponse.redirect(new URL("/login", request.url));
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
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const ensured = await ensurePortalAccountFromUser(user);

    if (!ensured.ok) {
      return NextResponse.redirect(new URL("/login?blocked=1", request.url));
    }

    const redirectTo = next === "/portal" ? "/login?confirmed=1" : next;

    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error("auth callback route failed:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}