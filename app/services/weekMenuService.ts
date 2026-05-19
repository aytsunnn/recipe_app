import { apiClient } from "./api";
import { Recipe } from "./recipeService";

export type MealType = "breakfast" | "lunch" | "snack" | "afternoon" | "dinner";

export interface WeekMenuEntry {
  id: string;
  day_of_week: number;
  recipe_id: string;
  meal_order?: number | null;
  meal_type?: MealType | null;
  Recipe?: Recipe | null;
  recipe?: Recipe | null;
  createdAt?: string;
  updatedAt?: string;
}

const toArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const raw = payload as Record<string, unknown>;
  const candidates = [raw.items, raw.data, raw.menu, raw.week_menu];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

const normalizeEntry = (item: unknown): WeekMenuEntry | null => {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const id =
    raw.id !== undefined && raw.id !== null
      ? String(raw.id)
      : raw.menu_id !== undefined && raw.menu_id !== null
      ? String(raw.menu_id)
      : null;
  const dayRaw = raw.day_of_week;
  const recipeIdRaw = raw.recipe_id;
  const day = Number(dayRaw);
  if (!id || !Number.isFinite(day) || day < 1 || day > 7) return null;
  return {
    id,
    day_of_week: day,
    recipe_id:
      recipeIdRaw !== undefined && recipeIdRaw !== null
        ? String(recipeIdRaw)
        : String((raw.Recipe as { id?: string | number } | undefined)?.id || ""),
    meal_order:
      typeof raw.meal_order === "number" ? raw.meal_order : Number(raw.meal_order) || null,
    meal_type: typeof raw.meal_type === "string" ? (raw.meal_type as MealType) : null,
    Recipe: (raw.Recipe as Recipe | undefined) || null,
    recipe: (raw.recipe as Recipe | undefined) || null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };
};

class WeekMenuService {
  async getWeekMenu(): Promise<WeekMenuEntry[]> {
    const endpoints = ["/admin/menu-of-week", "/menu-of-week"];
    let lastError: unknown = null;

    for (const endpoint of endpoints) {
      try {
        const response = await apiClient.get<unknown>(endpoint);
        const parsed = toArray(response).map(normalizeEntry).filter((i): i is WeekMenuEntry => Boolean(i));
        if (parsed.length || endpoint === "/admin/menu-of-week") {
          return parsed;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof Error) throw lastError;
    return [];
  }

  async addToWeekMenu(day_of_week: number, recipe_id: number, meal_order?: number): Promise<void> {
    await apiClient.post("/admin/menu-of-week", {
      day_of_week,
      recipe_id,
      ...(meal_order ? { meal_order } : {}),
    });
  }

  async removeFromWeekMenu(id: string): Promise<void> {
    await apiClient.delete(`/admin/menu-of-week/${id}`);
  }
}

export const weekMenuService = new WeekMenuService();
