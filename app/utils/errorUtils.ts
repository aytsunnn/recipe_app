export function isNotFoundErrorMessage(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : String(error);

  const normalized = message.toLowerCase();
  return (
    normalized.includes("404") ||
    normalized.includes("not found") ||
    normalized.includes("не найден") ||
    normalized.includes("не найдена") ||
    normalized.includes("не найдено")
  );
}

export function getUserFriendlyErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (!error) return fallback;
  const rawMessage =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : String(error);
  if (!rawMessage) return fallback;

  let cleaned = rawMessage.trim();

  // Normalize "API Error (502): ...."
  cleaned = cleaned.replace(/^API Error\s*\(\d+\)\s*:\s*/i, "");

  // Try to extract backend JSON payload message.
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    const jsonPart = cleaned.slice(jsonStart, jsonEnd + 1);
    try {
      const parsed = JSON.parse(jsonPart) as { message?: unknown; error?: unknown };
      const message =
        typeof parsed.message === "string" && parsed.message.trim()
          ? parsed.message.trim()
          : typeof parsed.error === "string" && parsed.error.trim()
            ? parsed.error.trim()
            : "";
      if (message) cleaned = message;
    } catch {
      // ignore invalid json
    }
  }

  // Hide technical HTTP status-only texts.
  if (/^\d{3}\b/.test(cleaned) || /bad gateway|gateway|http|cannot|doctype|<html/i.test(cleaned)) {
    return fallback;
  }

  // If the text is still too technical, return fallback.
  if (/api error|networkerror|failed to fetch|timeout|status code/i.test(cleaned)) {
    return fallback;
  }

  return cleaned || fallback;
}
