import { createAdminSupabase } from "@/lib/supabase/admin";

type HeadersLike = {
  get(name: string): string | null;
};

type SecurityEventInput = {
  eventType: string;
  uid?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  success: boolean;
  details?: Record<string, unknown>;
};

type RateLimitInput = {
  eventType: string;
  keyField: "ip_address" | "email" | "uid";
  keyValue?: string | null;
  windowSeconds: number;
  maxAttempts: number;
};

export function getClientIp(headers: HeadersLike) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return null;
}

export async function recordSecurityEvent(input: SecurityEventInput) {
  try {
    const admin = createAdminSupabase();

    await admin.from("security_events").insert({
      event_type: input.eventType,
      uid: input.uid ?? null,
      email: input.email ?? null,
      ip_address: input.ipAddress ?? null,
      success: input.success,
      details: input.details ?? {},
    });
  } catch (error) {
    console.error("recordSecurityEvent failed:", error);
  }
}

export async function isRateLimited(input: RateLimitInput) {
  if (!input.keyValue) {
    return false;
  }

  try {
    const admin = createAdminSupabase();
    const since = new Date(Date.now() - input.windowSeconds * 1000).toISOString();

    const { count, error } = await admin
      .from("security_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", input.eventType)
      .eq(input.keyField, input.keyValue)
      .gte("created_at", since);

    if (error) {
      console.error("isRateLimited failed:", error);
      return false;
    }

    return (count ?? 0) >= input.maxAttempts;
  } catch (error) {
    console.error("isRateLimited failed:", error);
    return false;
  }
}