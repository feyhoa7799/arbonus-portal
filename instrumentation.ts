type PatchedFetch = typeof fetch & {
  __arbonusPatched?: boolean;
};

function safeUrl(input: RequestInfo | URL): string {
  try {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    if ("url" in input) return input.url;
    return String(input);
  } catch {
    return "[unknown-url]";
  }
}

function shortStack(stack?: string) {
  if (!stack) return "[no stack]";
  return stack
    .split("\n")
    .slice(1, 8)
    .join("\n");
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const originalFetch = globalThis.fetch as PatchedFetch;

  if (!originalFetch || originalFetch.__arbonusPatched) {
    return;
  }

  const patched: PatchedFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = safeUrl(input);
    const method = init?.method || "GET";
    const startedAt = Date.now();
    const stack = new Error("FETCH_CALL_SITE").stack;

    try {
      const response = await originalFetch(input, init);
      return response;
    } catch (error) {
      const elapsed = Date.now() - startedAt;

      console.error("\n================ FETCH FAILED ================\n");
      console.error(`URL: ${url}`);
      console.error(`METHOD: ${method}`);
      console.error(`ELAPSED_MS: ${elapsed}`);
      console.error("STACK:");
      console.error(shortStack(stack));
      console.error("ERROR:");
      console.error(error);
      console.error("\n==============================================\n");

      throw error;
    }
  }) as PatchedFetch;

  patched.__arbonusPatched = true;
  globalThis.fetch = patched;

  console.log("[instrumentation] global fetch patched for diagnostics");
}