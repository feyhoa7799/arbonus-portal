import { loadEnvConfig } from "@next/env";
import fs from "node:fs";
import path from "node:path";
import { createAdminSupabase } from "../lib/supabase/admin";

loadEnvConfig(process.cwd());

type ResourceSeed = {
  slug: string;
  title: string;
  url: string;
};

async function main() {
  const admin = createAdminSupabase();
  const jsonPath = path.resolve(process.cwd(), "app-data", "resources-seed.json");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const resources = JSON.parse(raw) as ResourceSeed[];

  const payload = resources.map((resource) => ({
    slug: resource.slug,
    title: resource.title,
    resource_type: "external_link",
    external_url: resource.url,
    storage_bucket: null,
    storage_path: null,
    internal_path: null,
    is_active: true,
  }));

  const { error } = await admin.from("protected_resources").upsert(payload, {
    onConflict: "slug",
    ignoreDuplicates: false,
  });

  if (error) {
    throw error;
  }

  console.log(`Seeded ${payload.length} resources.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});