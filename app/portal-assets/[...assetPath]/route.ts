import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { lookup } from "mime-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ assetPath: string[] }>;
};

const ASSETS_DIR = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "tilda-export",
);

function getSafeAssetPath(assetPath: string[]) {
  const normalized = path.normalize(path.join(...assetPath));

  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return null;
  }

  const absolutePath = path.join(ASSETS_DIR, normalized);

  if (!absolutePath.startsWith(ASSETS_DIR)) {
    return null;
  }

  return absolutePath;
}

export async function GET(_request: NextRequest, { params }: RouteProps) {
  const { assetPath } = await params;
  const absolutePath = getSafeAssetPath(assetPath);

  if (!absolutePath) {
    return NextResponse.json({ error: "Asset path is not allowed." }, { status: 400 });
  }

  try {
    const file = await readFile(absolutePath);
    const contentType = lookup(absolutePath) || "application/octet-stream";

    return new Response(file, {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }
}
