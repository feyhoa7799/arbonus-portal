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
    /(<img\b[^>]*\bdata-original=(['"])([^'"]+)\2[^>]*?)\s+src=(['"])[^'"]*__resize__20x__[^'"]*\4/gi,
    "$1 src=$2$3$2",
  );

  const portalPatch = String.raw`
<style id="arbonus-portal-patch">
  .t-tildalabel,
  .t-tildalabel-free,
  a[href*="tilda.cc"],
  a[href*="tilda.ws"] {
    display: none !important;
    visibility: hidden !important;
  }
</style>
<script id="arbonus-portal-patch-script">
(function () {
  function normalizeImages() {
    document.querySelectorAll('img[data-original]').forEach(function (img) {
      var original = img.getAttribute('data-original');
      var current = img.getAttribute('src') || '';
      if (!original) return;
      if (!current || current.indexOf('__resize__20x__') !== -1 || current.indexOf('blank.gif') !== -1) {
        img.setAttribute('src', original);
      }
    });

    document.querySelectorAll('[data-content-cover-bg], [data-original]').forEach(function (node) {
      var bg = node.getAttribute('data-content-cover-bg') || node.getAttribute('data-original');
      var style = node.getAttribute('style') || '';
      if (bg && style.indexOf('__resize__20x__') !== -1) {
        node.setAttribute('style', style.replace(/url\((['"]?)[^)]*__resize__20x__([^)]*)\)/g, 'url(' + bg + ')'));
      }
    });
  }

  function removeTildaLabel() {
    document.querySelectorAll('.t-tildalabel, .t-tildalabel-free, a[href*="tilda.cc"], a[href*="tilda.ws"]').forEach(function (node) {
      node.remove();
    });
  }

  function isEdusonBlock(node) {
    var current = node;
    while (current && current !== document.body) {
      var text = (current.textContent || '').toLowerCase();
      if (text.indexOf('eduson') !== -1 || text.indexOf('библиотека курсов') !== -1) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var action = target.closest('a, button, .tn-atom');
    if (!action || !isEdusonBlock(action)) return;

    var text = (action.textContent || '').toLowerCase();
    var href = action.getAttribute('href') || '';
    var looksLikeEdusonAction =
      text.indexOf('получить доступ') !== -1 ||
      text.indexOf('перейти на сайт') !== -1 ||
      href.indexOf('eduson') !== -1;

    if (!looksLikeEdusonAction) return;

    event.preventDefault();
    event.stopPropagation();
    alert('Пока не доступно, ведутся работы.');
  }, true);

  normalizeImages();
  removeTildaLabel();
  document.addEventListener('DOMContentLoaded', function () {
    normalizeImages();
    removeTildaLabel();
    setTimeout(normalizeImages, 300);
    setTimeout(removeTildaLabel, 300);
    setTimeout(normalizeImages, 1000);
  });
})();
</script>`;

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
