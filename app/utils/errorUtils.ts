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

