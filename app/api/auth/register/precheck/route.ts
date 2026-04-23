import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizeUid } from "@/lib/uid";
import { verifyTurnstileToken } from "@/lib/turnstile";

const schema = z.object({
  uid: z.string().min(3).max(50),
  email: z.string().email(),
  turnstileToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте логин, email и капчу." },
      { status: 400 },
    );
  }

  const uid = normalizeUid(parsed.data.uid);

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  const turnstileOk = await verifyTurnstileToken(parsed.data.turnstileToken, ip);
  if (!turnstileOk) {
    return NextResponse.json(
      { error: "Не удалось подтвердить капчу. Попробуйте еще раз." },
      { status: 400 },
    );
  }

  const admin = createAdminSupabase();

  const { data: allowlistRow } = await admin
    .from("employee_allowlist")
    .select("uid, display_name, is_active")
    .eq("uid", uid)
    .maybeSingle();

  if (!allowlistRow || !allowlistRow.is_active) {
    return NextResponse.json(
      { error: "Такого логина нет в белом списке." },
      { status: 403 },
    );
  }

  const { data: existingByUid } = await admin
    .from("employee_accounts")
    .select("id")
    .eq("uid", uid)
    .eq("access_enabled", true)
    .maybeSingle();

  if (existingByUid) {
    return NextResponse.json(
      { error: "Для этого логина аккаунт уже создан." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    uid,
    displayName: allowlistRow.display_name,
  });
}
