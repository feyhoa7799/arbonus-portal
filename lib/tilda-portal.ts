import { readFileSync } from "node:fs";
import path from "node:path";

const PORTAL_HTML_PATH = path.join(process.cwd(), "app-data", "tilda-portal.html");

let cachedPortalHtml: string | null = null;

export function getPortalHtml(origin: string) {
  if (!cachedPortalHtml) {
    cachedPortalHtml = readFileSync(PORTAL_HTML_PATH, "utf-8");
  }

  return cachedPortalHtml.replaceAll("__SITE_URL__", origin);
}
