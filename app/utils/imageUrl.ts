const STORAGE_BASE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "/storage";

export function normalizeImageUrl(
  url: string | null | undefined,
  fallback: string
): string {
  if (!url) return fallback;

  const trimmed = String(url).trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return fallback;
  }

  const withPublicHost = trimmed
    .replace("http://127.0.0.1:9000", STORAGE_BASE_URL)
    .replace("http://localhost:9000", STORAGE_BASE_URL)
    .replace("http://127.0.0.1:9001", STORAGE_BASE_URL)
    .replace("http://localhost:9001", STORAGE_BASE_URL);

  if (
    withPublicHost.startsWith("http://") ||
    withPublicHost.startsWith("https://") ||
    withPublicHost.startsWith("blob:")
  ) {
    return withPublicHost;
  }

  if (withPublicHost.startsWith("/vkusno/")) {
    return `${STORAGE_BASE_URL}${withPublicHost}`;
  }

  if (withPublicHost.startsWith("vkusno/")) {
    return `${STORAGE_BASE_URL}/${withPublicHost}`;
  }

  if (
    /^(avatars|recipes|steps|categories|kitchens|celebrations)\//.test(
      withPublicHost
    )
  ) {
    return `${STORAGE_BASE_URL}/vkusno/${withPublicHost}`;
  }

  if (withPublicHost.startsWith("/")) {
    return withPublicHost;
  }

  return fallback;
}
