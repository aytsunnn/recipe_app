const STORAGE_BASE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "https://umami-recipes.ru/storage";

export function normalizeImageUrl(
  url: string | null | undefined,
  fallback: string
): string {
  if (!url) return fallback;

  const trimmed = String(url).trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return fallback;
  }

  // Replace any http(s)://hostname:9000/ with STORAGE_BASE_URL/
  // Handle 127.0.0.1, localhost, 10.8.0.40, 188.233.238.70, umami-recipes.ru
  const withPublicHost = trimmed.replace(
    /^https?:\/\/[^/]+:9000\//i,
    STORAGE_BASE_URL + "/"
  );

  if (
    withPublicHost.startsWith("http://") ||
    withPublicHost.startsWith("https://") ||
    withPublicHost.startsWith("blob:")
  ) {
    return withPublicHost;
  }

  // Prevent double /storage
  let cleanPath = withPublicHost;
  if (cleanPath.startsWith(STORAGE_BASE_URL + "/")) {
    cleanPath = cleanPath.substring(STORAGE_BASE_URL.length);
  }
  if (cleanPath === "/storage") {
    cleanPath = "/";
  }
  if (cleanPath.startsWith("/storage/")) {
    cleanPath = cleanPath.substring("/storage".length);
  }
  if (cleanPath.startsWith("storage/")) {
    cleanPath = cleanPath.substring("storage".length);
  }

  // At this point cleanPath might be /vkusno/... or vkusno/... or avatars/...
  if (cleanPath.startsWith("/vkusno/")) {
    return `${STORAGE_BASE_URL}${cleanPath}`;
  }

  if (cleanPath.startsWith("vkusno/")) {
    return `${STORAGE_BASE_URL}/${cleanPath}`;
  }

  if (
    /^\/?(avatars|recipes|steps|categories|kitchens|celebrations)\//.test(
      cleanPath
    )
  ) {
    // Ensure leading slash for the regex match if needed, but here we just prepend
    const pathWithoutLeadingSlash = cleanPath.startsWith("/") ? cleanPath.substring(1) : cleanPath;
    return `${STORAGE_BASE_URL}/vkusno/${pathWithoutLeadingSlash}`;
  }

  if (cleanPath.startsWith("/")) {
    return `${STORAGE_BASE_URL}${cleanPath}`;
  }

  if (/^[^/]+\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(cleanPath)) {
    return `${STORAGE_BASE_URL}/vkusno/${cleanPath}`;
  }

  return fallback;
}


