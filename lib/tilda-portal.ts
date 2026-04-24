import { readFileSync } from "node:fs";
import path from "node:path";

const PORTAL_HTML_PATH = path.join(process.cwd(), "app-data", "tilda-portal.html");

let cachedPortalHtml: string | null = null;

function getConfiguredSiteUrl() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");

  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  }

  return siteUrl;
}

export function getPortalHtml() {
  if (!cachedPortalHtml) {
    cachedPortalHtml = readFileSync(PORTAL_HTML_PATH, "utf-8");
  }

  return cachedPortalHtml.replaceAll("__SITE_URL__", getConfiguredSiteUrl());
}