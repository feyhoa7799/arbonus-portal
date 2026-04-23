import { NextRequest, NextResponse } from "next/server";
import { getPortalAccess } from "@/lib/auth-guards";
import { getPortalHtml } from "@/lib/tilda-portal";

export async function GET(request: NextRequest) {
  const access = await getPortalAccess();
  if (!access.ok) {
    return NextResponse.redirect(new URL("/login?blocked=1", request.url));
  }

  const origin = new URL(request.url).origin;
  const html = getPortalHtml(origin);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}
