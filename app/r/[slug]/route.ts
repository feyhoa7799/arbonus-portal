import { NextRequest, NextResponse } from "next/server";
import { getPortalAccess } from "@/lib/auth-guards";
import { findProtectedResource } from "@/lib/resources";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isAllowedExternalUrl } from "@/lib/external-urls";
import { getClientIp, isRateLimited, recordSecurityEvent } from "@/lib/security";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest, { params }: RouteProps) {
  const ipAddress = getClientIp(request.headers);
  const access = await getPortalAccess();

  if (!access.ok || !access.account) {
    await recordSecurityEvent({
      eventType: "protected_resource_access",
      ipAddress,
      success: false,
      details: { reason: "unauthorized" },
    });

    return NextResponse.redirect(new URL("/login?blocked=1", request.url));
  }

  if (
    await isRateLimited({
      eventType: "protected_resource_access",
      keyField: "uid",
      keyValue: access.account.uid,
      windowSeconds: 5 * 60,
      maxAttempts: 120,
    })
  ) {
    await recordSecurityEvent({
      eventType: "protected_resource_access",
      uid: access.account.uid,
      email: access.user?.email ?? null,
      ipAddress,
      success: false,
      details: { reason: "rate_limited" },
    });

    return NextResponse.json(
      { error: "Слишком много запросов. Попробуйте позже." },
      { status: 429 },
    );
  }

  const { slug } = await params;
  const resource = await findProtectedResource(slug);

  if (!resource || !resource.is_active) {
    await recordSecurityEvent({
      eventType: "protected_resource_access",
      uid: access.account.uid,
      email: access.user?.email ?? null,
      ipAddress,
      success: false,
      details: { reason: "resource_not_found", slug },
    });

    return NextResponse.json({ error: "Ресурс не найден." }, { status: 404 });
  }

  if (resource.resource_type === "external_link" && resource.external_url) {
    if (!isAllowedExternalUrl(resource.external_url)) {
      await recordSecurityEvent({
        eventType: "protected_resource_access",
        uid: access.account.uid,
        email: access.user?.email ?? null,
        ipAddress,
        success: false,
        details: { reason: "external_url_not_allowed", slug },
      });

      return NextResponse.json(
        { error: "Внешний адрес для этого ресурса не разрешен." },
        { status: 422 },
      );
    }

    await recordSecurityEvent({
      eventType: "protected_resource_access",
      uid: access.account.uid,
      email: access.user?.email ?? null,
      ipAddress,
      success: true,
      details: { reason: "external_redirect", slug },
    });

    return NextResponse.redirect(resource.external_url);
  }

  if (resource.resource_type === "page" && resource.internal_path) {
    if (!resource.internal_path.startsWith("/")) {
      await recordSecurityEvent({
        eventType: "protected_resource_access",
        uid: access.account.uid,
        email: access.user?.email ?? null,
        ipAddress,
        success: false,
        details: { reason: "invalid_internal_path", slug },
      });

      return NextResponse.json(
        { error: "Внутренний путь ресурса настроен неверно." },
        { status: 422 },
      );
    }

    await recordSecurityEvent({
      eventType: "protected_resource_access",
      uid: access.account.uid,
      email: access.user?.email ?? null,
      ipAddress,
      success: true,
      details: { reason: "internal_redirect", slug },
    });

    return NextResponse.redirect(new URL(resource.internal_path, request.url));
  }

  if (
    resource.resource_type === "file" &&
    resource.storage_bucket &&
    resource.storage_path
  ) {
    const admin = createAdminSupabase();
    const { data, error } = await admin.storage
      .from(resource.storage_bucket)
      .createSignedUrl(resource.storage_path, 20);

    if (error || !data?.signedUrl) {
      await recordSecurityEvent({
        eventType: "protected_resource_access",
        uid: access.account.uid,
        email: access.user?.email ?? null,
        ipAddress,
        success: false,
        details: { reason: "signed_url_failed", slug },
      });

      return NextResponse.json(
        { error: "Не удалось выдать доступ к файлу." },
        { status: 500 },
      );
    }

    await recordSecurityEvent({
      eventType: "protected_resource_access",
      uid: access.account.uid,
      email: access.user?.email ?? null,
      ipAddress,
      success: true,
      details: { reason: "signed_url_issued", slug },
    });

    return NextResponse.redirect(data.signedUrl);
  }

  await recordSecurityEvent({
    eventType: "protected_resource_access",
    uid: access.account.uid,
    email: access.user?.email ?? null,
    ipAddress,
    success: false,
    details: { reason: "resource_incomplete", slug },
  });

  return NextResponse.json(
    { error: "Ресурс настроен не полностью." },
    { status: 422 },
  );
}