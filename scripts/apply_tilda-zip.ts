import AdmZip from "adm-zip";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

type TildaManifest = {
  importedAt: string;
  sourceZip: string;
  entryPage: string;
  pages: string[];
  routeToPage: Record<string, string>;
};

const PROJECT_ROOT = process.cwd();
const INCOMING_ARG = process.argv[2];
const ENTRY_ARG = process.argv.find((arg) => arg.startsWith("--entry="))?.split("=")[1] ?? null;

const TILDA_EXPORT_DIR = path.join(PROJECT_ROOT, "tilda-export");
const TILDA_PAGES_DIR = path.join(PROJECT_ROOT, "app-data", "tilda-pages");
const BACKUPS_DIR = path.join(PROJECT_ROOT, "backups", "tilda");
const MANIFEST_PATH = path.join(TILDA_PAGES_DIR, "manifest.json");

function toPosix(value: string) {
  return value.split(path.sep).join("/");
}

function sanitizeTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function splitSuffix(value: string) {
  const match = value.match(/^([^?#]*)(.*)$/);
  return {
    base: match?.[1] ?? value,
    suffix: match?.[2] ?? "",
  };
}

function isExternalLike(value: string) {
  const lower = value.toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("//") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("#")
  );
}

function normalizeRelativePath(value: string) {
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));

  if (normalized === "." || normalized === "./") {
    return "";
  }

  if (normalized === ".." || normalized.startsWith("../")) {
    return null;
  }

  return normalized.replace(/^\.?\//, "");
}

function resolveRelativePath(currentPage: string, candidate: string) {
  const { base, suffix } = splitSuffix(candidate);

  if (!base) {
    return null;
  }

  let normalized: string | null;

  if (base.startsWith("/")) {
    normalized = normalizeRelativePath(base.slice(1));
  } else {
    const currentDir = path.posix.dirname(currentPage);
    normalized = normalizeRelativePath(path.posix.join(currentDir, base));
  }

  if (!normalized) {
    return null;
  }

  return {
    normalized,
    suffix,
  };
}

async function pathExists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(target: string) {
  await fs.mkdir(target, { recursive: true });
}

async function clearDir(target: string) {
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
}

async function collectFiles(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const result: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      result.push(...(await collectFiles(absolute)));
      continue;
    }

    if (entry.isFile()) {
      result.push(absolute);
    }
  }

  return result;
}

async function unwrapSingleDirectory(rootDir: string) {
  let current = rootDir;

  while (true) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile());
    const dirs = entries.filter((entry) => entry.isDirectory());

    if (files.length === 0 && dirs.length === 1) {
      current = path.join(current, dirs[0].name);
      continue;
    }

    return current;
  }
}

function buildRouteForPage(relativeHtmlPath: string, entryPage: string) {
  if (relativeHtmlPath === entryPage) {
    return "/portal";
  }

  if (relativeHtmlPath.endsWith("/index.html")) {
    const dir = relativeHtmlPath.slice(0, -"/index.html".length);
    return `/portal/${dir}`;
  }

  if (relativeHtmlPath === "index.html") {
    return "/portal";
  }

  return `/portal/${relativeHtmlPath.replace(/\.html$/i, "")}`;
}

function pickEntryPage(htmlPages: string[]) {
  if (ENTRY_ARG) {
    const normalized = normalizeRelativePath(ENTRY_ARG);
    if (!normalized || !htmlPages.includes(normalized)) {
      throw new Error(`Entry page "${ENTRY_ARG}" не найдена внутри архива.`);
    }
    return normalized;
  }

  if (htmlPages.includes("index.html")) {
    return "index.html";
  }

  if (htmlPages.length === 1) {
    return htmlPages[0];
  }

  const rootLevelPages = htmlPages.filter((page) => !page.includes("/")).sort();
  if (rootLevelPages.length > 0) {
    return rootLevelPages[0];
  }

  return [...htmlPages].sort()[0];
}

function rewriteHtmlContent(
  html: string,
  currentPage: string,
  htmlRouteMap: Map<string, string>,
  assetSet: Set<string>,
) {
  const rewriteValue = (originalValue: string, preferAssetOnly = false) => {
    if (!originalValue || isExternalLike(originalValue)) {
      return originalValue;
    }

    const resolved = resolveRelativePath(currentPage, originalValue);
    if (!resolved) {
      return originalValue;
    }

    const assetTarget = assetSet.has(resolved.normalized)
      ? `/portal-assets/${resolved.normalized}${resolved.suffix}`
      : null;

    if (preferAssetOnly) {
      return assetTarget ?? originalValue;
    }

    const pageTarget = htmlRouteMap.get(resolved.normalized)
      ? `${htmlRouteMap.get(resolved.normalized)}${resolved.suffix}`
      : null;

    if (pageTarget) {
      return pageTarget;
    }

    if (assetTarget) {
      return assetTarget;
    }

    return originalValue;
  };

  let output = html;

  output = output.replace(
    /\b(href|src|poster|action|data-original|data-img-zoom-url|data-content-cover-bg|content)=("([^"]*)"|'([^']*)')/gi,
    (full, attr, quotedValue, doubleQuotedValue, singleQuotedValue) => {
      const value = doubleQuotedValue ?? singleQuotedValue ?? "";
      const rewritten = rewriteValue(value, attr.toLowerCase() === "content" || attr.toLowerCase() === "poster");
      const quote = quotedValue.startsWith('"') ? '"' : "'";
      return `${attr}=${quote}${rewritten}${quote}`;
    },
  );

  output = output.replace(/url\((['"]?)([^'")]+)\1\)/gi, (full, quote, value) => {
    const rewritten = rewriteValue(value, true);
    const actualQuote = quote || "";
    return `url(${actualQuote}${rewritten}${actualQuote})`;
  });

  return output;
}

async function copyFilePreservingTree(sourceRoot: string, absoluteSource: string, targetRoot: string) {
  const relative = path.relative(sourceRoot, absoluteSource);
  const target = path.join(targetRoot, relative);
  await ensureDir(path.dirname(target));
  await fs.copyFile(absoluteSource, target);
}

async function backupCurrentVersion() {
  const timestamp = sanitizeTimestamp();
  const backupRoot = path.join(BACKUPS_DIR, timestamp);

  const hasExport = await pathExists(TILDA_EXPORT_DIR);
  const hasPages = await pathExists(TILDA_PAGES_DIR);

  if (!hasExport && !hasPages) {
    return null;
  }

  await ensureDir(backupRoot);

  if (hasExport) {
    await fs.cp(TILDA_EXPORT_DIR, path.join(backupRoot, "tilda-export"), {
      recursive: true,
      force: true,
    });
  }

  if (hasPages) {
    await fs.cp(TILDA_PAGES_DIR, path.join(backupRoot, "tilda-pages"), {
      recursive: true,
      force: true,
    });
  }

  return backupRoot;
}

async function main() {
  if (!INCOMING_ARG) {
    throw new Error("Укажите путь к ZIP архиву. Пример: npm run tilda:apply -- ./incoming-tilda/update.zip");
  }

  const zipPath = path.resolve(PROJECT_ROOT, INCOMING_ARG);

  if (!(await pathExists(zipPath))) {
    throw new Error(`ZIP архив не найден: ${zipPath}`);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "arbonus-tilda-"));
  const extractedRoot = path.join(tempDir, "unzipped");

  await ensureDir(extractedRoot);

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractedRoot, true);

  const sourceRoot = await unwrapSingleDirectory(extractedRoot);
  const absoluteFiles = await collectFiles(sourceRoot);

  const htmlFiles = absoluteFiles
    .filter((file) => file.toLowerCase().endsWith(".html"))
    .map((file) => toPosix(path.relative(sourceRoot, file)))
    .sort();

  if (htmlFiles.length === 0) {
    throw new Error("В архиве не найдено ни одного HTML файла.");
  }

  const entryPage = pickEntryPage(htmlFiles);

  const routeToPage: Record<string, string> = {};
  const htmlRouteMap = new Map<string, string>();

  for (const page of htmlFiles) {
    const route = buildRouteForPage(page, entryPage);
    routeToPage[route] = page;
    htmlRouteMap.set(page, route);
  }

  const assetFiles = absoluteFiles.filter((file) => !file.toLowerCase().endsWith(".html"));
  const assetSet = new Set(assetFiles.map((file) => toPosix(path.relative(sourceRoot, file))));

  const backupRoot = await backupCurrentVersion();

  await clearDir(TILDA_EXPORT_DIR);
  await clearDir(TILDA_PAGES_DIR);

  for (const assetFile of assetFiles) {
    await copyFilePreservingTree(sourceRoot, assetFile, TILDA_EXPORT_DIR);
  }

  for (const htmlFile of htmlFiles) {
    const absoluteHtmlFile = path.join(sourceRoot, htmlFile);
    const rawHtml = await fs.readFile(absoluteHtmlFile, "utf-8");
    const rewrittenHtml = rewriteHtmlContent(rawHtml, htmlFile, htmlRouteMap, assetSet);

    const targetPath = path.join(TILDA_PAGES_DIR, htmlFile);
    await ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, rewrittenHtml, "utf-8");
  }

  const manifest: TildaManifest = {
    importedAt: new Date().toISOString(),
    sourceZip: path.basename(zipPath),
    entryPage,
    pages: htmlFiles,
    routeToPage,
  };

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
  await fs.rm(tempDir, { recursive: true, force: true });

  console.log("");
  console.log("Tilda import completed.");
  console.log(`ZIP: ${zipPath}`);
  console.log(`Entry page: ${entryPage}`);
  console.log(`HTML pages: ${htmlFiles.length}`);
  console.log(`Assets: ${assetFiles.length}`);
  console.log(`Backup: ${backupRoot ?? "no previous version"}`);
  console.log("");
  console.log("Next steps:");
  console.log("1. npm run dev");
  console.log("2. Проверить /portal и внутренние страницы");
  console.log("3. npm run build");
  console.log("4. git add . && git commit && git push");
}

main().catch((error) => {
  console.error("");
  console.error("Tilda import failed.");
  console.error(error instanceof Error ? error.message : error);
  console.error("");
  process.exit(1);
});