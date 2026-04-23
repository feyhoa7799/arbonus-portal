import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizeUid } from "@/lib/uid";
import type { AllowlistRow, EmployeeAccountRow } from "@/types/db";

type AccessResult = {
  ok: boolean;
  user?: User;
  account?: EmployeeAccountRow;
  allowlist?: AllowlistRow;
};

export async function ensurePortalAccountFromUser(user: User): Promise<AccessResult> {
  try {
    const uid = normalizeUid(String(user.user_metadata?.uid ?? ""));
    if (!uid) {
      return { ok: false };
    }

    const admin = createAdminSupabase();

    const { data: allowlist, error: allowlistError } = await admin
      .from("employee_allowlist")
      .select("*")
      .eq("uid", uid)
      .maybeSingle();

    if (allowlistError || !allowlist || !allowlist.is_active) {
      return { ok: false };
    }

    const { data: existingByUid, error: existingError } = await admin
      .from("employee_accounts")
      .select("*")
      .eq("uid", uid)
      .maybeSingle();

    if (existingError) {
      return { ok: false };
    }

    if (existingByUid && existingByUid.auth_user_id !== user.id) {
      return { ok: false };
    }

    const payload = {
      auth_user_id: user.id,
      uid,
      email: (user.email ?? "").toLowerCase(),
      access_enabled: true,
      email_confirmed: Boolean(user.email_confirmed_at),
    };

    const { data: account, error } = await admin
      .from("employee_accounts")
      .upsert(payload, {
        onConflict: "auth_user_id",
        ignoreDuplicates: false,
      })
      .select("*")
      .single();

    if (error || !account) {
      return { ok: false };
    }

    return {
      ok: true,
      user,
      account: account as EmployeeAccountRow,
      allowlist: allowlist as AllowlistRow,
    };
  } catch (error) {
    console.error("ensurePortalAccountFromUser failed:", error);
    return { ok: false };
  }
}

export async function getPortalAccess(): Promise<AccessResult> {
  try {
    const supabase = await getServerSupabase();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { ok: false };
    }

    const ensured = await ensurePortalAccountFromUser(user);

    if (!ensured.ok || !ensured.account || !ensured.allowlist) {
      return { ok: false };
    }

    if (!ensured.account.access_enabled || !ensured.allowlist.is_active) {
      return { ok: false };
    }

    return ensured;
  } catch (error) {
    console.error("getPortalAccess failed:", error);
    return { ok: false };
  }
}

export async function assertPortalAccess() {
  const access = await getPortalAccess();

  if (!access.ok || !access.user || !access.account || !access.allowlist) {
    redirect("/login?blocked=1");
  }

  return access as Required<AccessResult>;
}