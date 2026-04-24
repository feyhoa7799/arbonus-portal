import { NextRequest, NextResponse } from "next/server";
import { getPortalAccess } from "@/lib/auth-guards";
import { getPortalPageBySlug } from "@/lib/tilda-pages";
import { getClientIp, recordSecurityEvent } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ slug?: string[] }>;
};

export async function GET(request: NextRequest, { params }: RouteProps) {
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

  const slugParts = (await params).slug ?? [];
  const page = getPortalPageBySlug(slugParts);

  if (!page) {
    await recordSecurityEvent({
      eventType: "portal_access",
      uid: access.account?.uid ?? null,
      email: access.user?.email ?? null,
      ipAddress,
      success: false,
      details: {
        reason: "page_not_found",
        slugParts,
      },
    });

    return NextResponse.json({ error: "Страница портала не найдена." }, { status: 404 });
  }

  await recordSecurityEvent({
    eventType: "portal_access",
    uid: access.account?.uid ?? null,
    email: access.user?.email ?? null,
    ipAddress,
    success: true,
    details: {
      reason: "portal_page_opened",
      routePath: page.routePath,
      relativeHtmlPath: page.relativeHtmlPath,
    },
  });

  return new Response(page.html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}