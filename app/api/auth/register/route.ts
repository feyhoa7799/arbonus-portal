import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createPublicSupabase } from "@/lib/supabase/public";
import { normalizeUid } from "@/lib/uid";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { getClientIp, isRateLimited, recordSecurityEvent } from "@/lib/security";

const schema = z.object({
  uid: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  turnstileToken: z.string().min(1),
});

const GENERIC_REGISTER_ERROR =
  "Не удалось зарегистрировать аккаунт. Проверьте данные или попробуйте позже.";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
  export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  const ipAddress = getClientIp(request.headers);

  if (!parsed.success) {
    await recordSecurityEvent({
      eventType: "register_attempt",
      ipAddress,
      success: false,
      details: { reason: "invalid_payload" },
    });

    return NextResponse.json({ error: GENERIC_REGISTER_ERROR }, { status: 400 });
  }

  const uid = normalizeUid(parsed.data.uid);
  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const turnstileToken = parsed.data.turnstileToken;

  if (
    (await isRateLimited({
      eventType: "register_attempt",
      keyField: "ip_address",
      keyValue: ipAddress,
      windowSeconds: 15 * 60,
      maxAttempts: 10,
    })) ||
    (await isRateLimited({
      eventType: "register_attempt",
      keyField: "uid",
      keyValue: uid,
      windowSeconds: 15 * 60,
      maxAttempts: 5,
    })) ||
    (await isRateLimited({
      eventType: "register_attempt",
      keyField: "email",
      keyValue: email,
      windowSeconds: 15 * 60,
      maxAttempts: 5,
    }))
  ) {
    await recordSecurityEvent({
      eventType: "register_attempt",
      uid,
      email,
      ipAddress,
      success: false,
      details: { reason: "rate_limited" },
    });

    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429 },
    );
  }

  const turnstileOk = await verifyTurnstileToken(turnstileToken, ipAddress ?? undefined);
  if (!turnstileOk) {
    await recordSecurityEvent({
      eventType: "register_attempt",
      uid,
      email,
      ipAddress,
      success: false,
      details: { reason: "turnstile_failed" },
    });

    return NextResponse.json({ error: GENERIC_REGISTER_ERROR }, { status: 400 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  if (!siteUrl) {
    await recordSecurityEvent({
      eventType: "register_attempt",
      uid,
      email,
      ipAddress,
      success: false,
      details: { reason: "missing_site_url" },
    });

    return NextResponse.json({ error: GENERIC_REGISTER_ERROR }, { status: 500 });
  }

  const admin = createAdminSupabase();

  const { data: allowlistRow, error: allowlistError } = await admin
    .from("employee_allowlist")
    .select("uid, is_active")
    .eq("uid", uid)
    .maybeSingle();

  if (allowlistError || !allowlistRow || !allowlistRow.is_active) {
    await recordSecurityEvent({
      eventType: "register_attempt",
      uid,
      email,
      ipAddress,
      success: false,
      details: { reason: "allowlist_rejected" },
    });

    return NextResponse.json({ error: GENERIC_REGISTER_ERROR }, { status: 400 });
  }

  const { data: existingAccount, error: existingError } = await admin
    .from("employee_accounts")
    .select("id")
    .eq("uid", uid)
    .eq("access_enabled", true)
    .maybeSingle();

  if (existingError || existingAccount) {
    await recordSecurityEvent({
      eventType: "register_attempt",
      uid,
      email,
      ipAddress,
      success: false,
      details: { reason: "existing_account" },
    });

    return NextResponse.json({ error: GENERIC_REGISTER_ERROR }, { status: 400 });
  }

  const nonce = randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: nonceError } = await admin.from("registration_nonces").insert({
    nonce,
    uid,
    email,
    expires_at: expiresAt,
  });

  if (nonceError) {
    await recordSecurityEvent({
      eventType: "register_attempt",
      uid,
      email,
      ipAddress,
      success: false,
      details: { reason: "nonce_insert_failed" },
    });

    return NextResponse.json({ error: GENERIC_REGISTER_ERROR }, { status: 500 });
  }

  const publicClient = createPublicSupabase();

  const { error: signUpError } = await publicClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/portal`,
      data: {
        uid,
        reg_nonce: nonce,
      },
    },
  });

  if (signUpError) {
    await admin.from("registration_nonces").delete().eq("nonce", nonce).is("used_at", null);

    await recordSecurityEvent({
      eventType: "register_attempt",
      uid,
      email,
      ipAddress,
      success: false,
      details: {
        reason: "signup_failed",
        authMessage: signUpError.message,
      },
    });

    return NextResponse.json({ error: GENERIC_REGISTER_ERROR }, { status: 400 });
  }

  await recordSecurityEvent({
    eventType: "register_attempt",
    uid,
    email,
    ipAddress,
    success: true,
    details: { reason: "signup_created" },
  });

  return NextResponse.json({
    ok: true,
    message: "Если данные верны, проверьте почту для подтверждения аккаунта.",
  });
}