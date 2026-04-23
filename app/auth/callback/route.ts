import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { ensurePortalAccountFromUser } from "@/lib/auth-guards";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/portal";

  const supabase = await getServerSupabase();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const ensured = await ensurePortalAccountFromUser(user);

  if (!ensured.ok) {
    return NextResponse.redirect(new URL("/login?blocked=1", request.url));
  }

  const redirectTo =
    next === "/portal"
      ? "/login?confirmed=1"
      : next;

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
