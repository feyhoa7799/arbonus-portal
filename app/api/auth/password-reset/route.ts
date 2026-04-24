import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPublicSupabase } from "@/lib/supabase/public";
import { getClientIp, isRateLimited, recordSecurityEvent } from "@/lib/security";

const schema = z.object({
  email: z.string().email(),
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  const ipAddress = getClientIp(request.headers);

  if (!parsed.success) {
    await recordSecurityEvent({
      eventType: "password_reset_request",
      ipAddress,
      success: false,
      details: { reason: "invalid_payload" },
    });

    return NextResponse.json(
      { error: "Не удалось обработать запрос. Попробуйте позже." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (
    (await isRateLimited({
      eventType: "password_reset_request",
      keyField: "ip_address",
      keyValue: ipAddress,
      windowSeconds: 15 * 60,
      maxAttempts: 10,
    })) ||
    (await isRateLimited({
      eventType: "password_reset_request",
      keyField: "email",
      keyValue: email,
      windowSeconds: 15 * 60,
      maxAttempts: 5,
    }))
  ) {
    await recordSecurityEvent({
      eventType: "password_reset_request",
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

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  const publicClient = createPublicSupabase();

  try {
    await publicClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });

    await recordSecurityEvent({
      eventType: "password_reset_request",
      email,
      ipAddress,
      success: true,
      details: { reason: "reset_requested" },
    });
  } catch (error) {
    await recordSecurityEvent({
      eventType: "password_reset_request",
      email,
      ipAddress,
      success: false,
      details: { reason: "provider_error", error: String(error) },
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Если такой email существует, письмо для сброса пароля будет отправлено.",
  });
}