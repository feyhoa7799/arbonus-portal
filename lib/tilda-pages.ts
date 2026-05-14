import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

type TildaManifest = {
  importedAt: string;
  sourceZip: string;
  entryPage: string;
  pages: string[];
  routeToPage: Record<string, string>;
};

const TILDA_PAGES_DIR = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "app-data",
  "tilda-pages",
);

const MANIFEST_PATH = path.join(TILDA_PAGES_DIR, "manifest.json");
const LEGACY_PORTAL_HTML_PATH = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "app-data",
  "tilda-portal.html",
);

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

function preparePortalHtml(rawHtml: string) {
  const siteUrl = getConfiguredSiteUrl();

  let html = rawHtml
    .replaceAll("__SITE_URL__", siteUrl)
    .replace(
      /<link\s+rel=["']shortcut icon["'][^>]*>/i,
      '<link rel="icon" href="/site-icon.svg" type="image/svg+xml"/>',
    );

  html = html.replace(
    /(<img\b[^>]*\bdata-original=(['"])([^'"]+)\2[^>]*?)\s+src=(['"])[^'"]*(?:__resize__20x__|blank\.gif)[^'"]*\4/gi,
    "$1 src=$2$3$2",
  );

  const portalPatch = `
<style id="arbonus-portal-patch">
  .t-tildalabel,
  .t-tildalabel-free,
  .t-tildalabel__wrapper,
  [class*="tildalabel"],
  a[href*="tilda.cc"],
  a[href*="tilda.ws"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
</style>
<script src="/arbonus-portal-patch.js" defer></script>`;

  return html.includes("</body>") ? html.replace("</body>", `${portalPatch}</body>`) : `${html}${portalPatch}`;
}

function loadLegacyPortal() {
  if (!existsSync(LEGACY_PORTAL_HTML_PATH)) {
    return null;
  }

  const html = preparePortalHtml(readFileSync(LEGACY_PORTAL_HTML_PATH, "utf-8"));

  return {
    html,
    routePath: "/portal",
    relativeHtmlPath: "legacy:tilda-portal.html",
  };
}

export function getPortalPageBySlug(slugParts?: string[]) {
  const isRootPortal = !slugParts || slugParts.length === 0;

  if (!existsSync(MANIFEST_PATH)) {
    if (!isRootPortal) {
      return null;
    }

    return loadLegacyPortal();
  }

  const manifest = loadManifest();
  const routePath =
    !slugParts || slugParts.length === 0 ? "/portal" : `/portal/${slugParts.join("/")}`;

  const relativeHtmlPath = manifest.routeToPage[routePath];
  if (!relativeHtmlPath) {
    return null;
  }

  const absoluteHtmlPath = path.join(TILDA_PAGES_DIR, relativeHtmlPath);
  const html = preparePortalHtml(readFileSync(absoluteHtmlPath, "utf-8"));

  return {
    html,
    routePath,
    relativeHtmlPath,
  };
}
