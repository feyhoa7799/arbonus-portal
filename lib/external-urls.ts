function normalizeHost(value: string) {
  return value.trim().toLowerCase();
}

function getAllowedHosts() {
  return (process.env.ALLOWED_EXTERNAL_HOSTS ?? "")
    .split(",")
    .map(normalizeHost)
    .filter(Boolean);
}

export function isAllowedExternalUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return false;
    }

    const host = normalizeHost(url.hostname);
    const allowedHosts = getAllowedHosts();

    if (!allowedHosts.length) {
      return false;
    }

    return allowedHosts.some((allowed) => {
      return host === allowed || host.endsWith(`.${allowed}`);
    });
  } catch {
    return false;
  }
}