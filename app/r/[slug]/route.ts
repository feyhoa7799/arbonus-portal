import { NextRequest, NextResponse } from "next/server";
import { getPortalAccess } from "@/lib/auth-guards";
import { findProtectedResource } from "@/lib/resources";
import { createAdminSupabase } from "@/lib/supabase/admin";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RouteProps) {
  const access = await getPortalAccess();
  if (!access.ok) {
    return NextResponse.redirect(new URL("/login?blocked=1", request.url));
  }

  const { slug } = await params;
  const resource = await findProtectedResource(slug);

  if (!resource || !resource.is_active) {
    return NextResponse.json({ error: "Ресурс не найден." }, { status: 404 });
  }

  if (resource.resource_type === "external_link" && resource.external_url) {
    return NextResponse.redirect(resource.external_url);
  }

  if (resource.resource_type === "page" && resource.internal_path) {
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
      .createSignedUrl(resource.storage_path, 60);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: "Не удалось выдать доступ к файлу." },
        { status: 500 },
      );
    }

    return NextResponse.redirect(data.signedUrl);
  }

  return NextResponse.json(
    { error: "Ресурс настроен не полностью." },
    { status: 422 },
  );
}
