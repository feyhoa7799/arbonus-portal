import { NextRequest, NextResponse } from "next/server";
import { getPortalAccess } from "@/lib/auth-guards";
import { getPortalHtml } from "@/lib/tilda-portal";
import { getClientIp, recordSecurityEvent } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const ipAddress = getClientIp(request.headers);
  const access = await getPortalAccess();

  if (!access.ok) {
    await recordSecurityEvent({
      eventType: "portal_access",
      ipAddress,
      success: false,
      details: { reason: "unauthorized" },
    });

    return NextResponse.redirect(new URL("/login?blocked=1", request.url));
  }

  const html = getPortalHtml();

  await recordSecurityEvent({
    eventType: "portal_access",
    uid: access.account?.uid ?? null,
    email: access.user?.email ?? null,
    ipAddress,
    success: true,
    details: { reason: "portal_opened" },
  });

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}