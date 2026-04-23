import type { ProtectedResourceRow } from "@/types/db";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function findProtectedResource(slug: string): Promise<ProtectedResourceRow | null> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("protected_resources")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ProtectedResourceRow;
}
