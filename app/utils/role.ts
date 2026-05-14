export const normalizeRole = (role?: string | null): string => {
  return (role || "").trim().toLowerCase().replace(/\s+/g, "_");
};

export const canAccessModeration = (role?: string | null): boolean => {
  const normalized = normalizeRole(role);
  if (!normalized) return false;

  return (
    normalized === "admin" ||
    normalized === "administrator" ||
    normalized === "role_admin" ||
    normalized.includes("admin") ||
    normalized === "moderator" ||
    normalized === "mod" ||
    normalized === "role_moderator" ||
    normalized.includes("moderator")
  );
};
