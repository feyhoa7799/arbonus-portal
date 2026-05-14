import { NextRequest, NextResponse } from "next/server";
import { lookup as lookupMimeType } from "mime-types";
import path from "node:path";
import { promises as fs } from "node:fs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ asset: string[] }>;
};

const BASE_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "tilda-export");

function safeResolve(parts: string[]) {
  const resolved = path.resolve(BASE_DIR, ...parts);
  if (!resolved.startsWith(BASE_DIR)) {
    return null;
  }
  return resolved;
}

export async function GET(_request: NextRequest, { params }: RouteProps) {
  const { asset } = await params;
  const absolutePath = safeResolve(asset);

  if (!absolutePath) {
    return NextResponse.json({ error: "Неверный путь к ресурсу." }, { status: 400 });
  }

  try {
    const file = await fs.readFile(absolutePath);
    const mimeType = lookupMimeType(absolutePath) || "application/octet-stream";

    return new Response(file, {
      headers: {
        "content-type": String(mimeType),
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Файл не найден." }, { status: 404 });
  }
}