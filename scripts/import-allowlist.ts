import { loadEnvConfig } from "@next/env";
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { createAdminSupabase } from "../lib/supabase/admin";
import { normalizeUid } from "../lib/uid";

loadEnvConfig(process.cwd());

type RawRow = {
  UID?: string;
  "First name"?: string;
  "Middle name first letter"?: string;
  "Middle name first letter "?: string;
  "Last name"?: string;
  Store?: string;
};

function getInputPath() {
  const cliArg = process.argv[2];
  return cliArg || process.env.ALLOWLIST_IMPORT_PATH;
}

function makeDisplayName(lastName: string, firstName: string, middleInitial?: string) {
  const initial = (middleInitial ?? "").trim();
  return [lastName.trim(), firstName.trim(), initial ? `${initial}.` : ""]
    .filter(Boolean)
    .join(" ");
}

async function main() {
  const inputPath = getInputPath();

  if (!inputPath) {
    throw new Error("Не передан путь к Excel-файлу.");
  }

  const resolvedPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Файл не найден: ${resolvedPath}`);
  }

  const workbook = XLSX.readFile(resolvedPath);
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
    defval: "",
    raw: false,
  });

  const normalizedRows = rows
    .map((row) => {
      const uid = normalizeUid(String(row.UID ?? ""));
      const firstName = String(row["First name"] ?? "").trim();
      const middleInitial = String(
        row["Middle name first letter "] || row["Middle name first letter"] || "",
      ).trim();
      const lastName = String(row["Last name"] ?? "").trim();
      const storeName = String(row.Store ?? "").trim();

      if (!uid || !firstName || !lastName || !storeName) {
        return null;
      }

      return {
        uid,
        first_name: firstName,
        middle_initial: middleInitial || null,
        last_name: lastName,
        display_name: makeDisplayName(lastName, firstName, middleInitial),
        store_name: storeName,
        is_active: true,
        last_imported_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (!normalizedRows.length) {
    throw new Error("После разбора Excel не найдено ни одной валидной строки.");
  }

  const admin = createAdminSupabase();

  const { error: upsertError } = await admin.from("employee_allowlist").upsert(normalizedRows, {
    onConflict: "uid",
    ignoreDuplicates: false,
  });

  if (upsertError) {
    throw upsertError;
  }

  const currentUids = normalizedRows.map((row) => row!.uid);

  const { data: existingRows, error: fetchError } = await admin
    .from("employee_allowlist")
    .select("uid");

  if (fetchError) {
    throw fetchError;
  }

  const staleUids = (existingRows ?? [])
    .map((row) => row.uid)
    .filter((uid) => !currentUids.includes(uid));

  if (staleUids.length) {
    const { error: deactivateAllowlistError } = await admin
      .from("employee_allowlist")
      .update({ is_active: false })
      .in("uid", staleUids);

    if (deactivateAllowlistError) {
      throw deactivateAllowlistError;
    }

    const { error: deactivateAccountsError } = await admin
      .from("employee_accounts")
      .update({ access_enabled: false })
      .in("uid", staleUids);

    if (deactivateAccountsError) {
      throw deactivateAccountsError;
    }
  }

  console.log(
    JSON.stringify(
      {
        imported: normalizedRows.length,
        deactivated: staleUids.length,
        source: resolvedPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});