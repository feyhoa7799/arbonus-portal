import { readFileSync } from "node:fs";
import path from "node:path";

type TildaManifest = {
  importedAt: string;
  sourceZip: string;
  entryPage: string;
  pages: string[];
  routeToPage: Record<string, string>;
};

const TILDA_PAGES_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "app-data", "tilda-pages");
const MANIFEST_PATH = path.join(TILDA_PAGES_DIR, "manifest.json");

function getConfiguredSiteUrl() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");

  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  }

  return siteUrl;
}

function loadManifest() {
  const raw = readFileSync(MANIFEST_PATH, "utf-8");
  return JSON.parse(raw) as TildaManifest;
}

export function getPortalPageBySlug(slugParts?: string[]) {
  const manifest = loadManifest();
  const routePath =
    !slugParts || slugParts.length === 0 ? "/portal" : `/portal/${slugParts.join("/")}`;

  const relativeHtmlPath = manifest.routeToPage[routePath];
  if (!relativeHtmlPath) {
    return null;
  }

  const absoluteHtmlPath = path.join(TILDA_PAGES_DIR, relativeHtmlPath);
  const html = readFileSync(absoluteHtmlPath, "utf-8").replaceAll(
    "__SITE_URL__",
    getConfiguredSiteUrl(),
  );

  return {
    html,
    routePath,
    relativeHtmlPath,
  };
}