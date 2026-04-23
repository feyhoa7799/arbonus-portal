import fs from "node:fs";
import path from "node:path";
import { createAdminSupabase } from "../lib/supabase/admin";

async function main() {
  const slug = process.argv[2];
  const filePath = process.argv[3];
  const mimeType = process.argv[4] || "application/octet-stream";
  const bucket = process.argv[5] || "site-private-files";

  if (!slug || !filePath) {
    throw new Error(
      "Использование: npm run upload:resource -- <slug> <filePath> [mimeType] [bucket]",
    );
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Файл не найден: ${absolutePath}`);
  }

  const fileBuffer = fs.readFileSync(absolutePath);
  const fileName = path.basename(absolutePath);
  const storagePath = `${slug}/${Date.now()}-${fileName}`;

  const admin = createAdminSupabase();

  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { error: updateError } = await admin
    .from("protected_resources")
    .update({
      resource_type: "file",
      storage_bucket: bucket,
      storage_path: storagePath,
      external_url: null,
      internal_path: null,
      is_active: true,
    })
    .eq("slug", slug);

  if (updateError) {
    throw updateError;
  }

  console.log(
    JSON.stringify(
      {
        slug,
        bucket,
        storagePath,
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
