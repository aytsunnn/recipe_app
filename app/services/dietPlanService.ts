import { apiClient } from "./api";

export interface DietPlanRecipeInput {
  recipe_id: number;
  day_of_week: number;
  meal_order: number;
}

export interface DietPlanPayload {
  title: string;
  description?: string;
  is_private?: boolean;
  recipes: DietPlanRecipeInput[];
}

export interface DietPlan {
  id: string;
  title: string;
  description?: string | null;
  is_private?: boolean;
  user_id?: string | number;
  createdAt?: string;
  updatedAt?: string;
  recipes?: DietPlanRecipeInput[];
  PlanRecipes?: Array<Record<string, unknown>>;
}

const toArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const raw = payload as Record<string, unknown>;
  const candidates = [raw.items, raw.data, raw.rows, raw.plans, raw.dietPlans];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

const normalizeRecipes = (raw: Record<string, unknown>): DietPlanRecipeInput[] => {
  const source = raw.recipes || raw.PlanRecipes || raw.planRecipes;
  if (!Array.isArray(source)) return [];
  return source
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const recipe_id = Number(row.recipe_id ?? (row.Recipe as { id?: number } | undefined)?.id);
      const day_of_week = Number(row.day_of_week);
      const meal_order = Number(row.meal_order);
      if (!Number.isFinite(recipe_id) || !Number.isFinite(day_of_week) || !Number.isFinite(meal_order)) {
        return null;
      }
      return { recipe_id, day_of_week, meal_order };
    })
    .filter((item): item is DietPlanRecipeInput => Boolean(item));
};

const normalizePlan = (item: unknown): DietPlan | null => {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const idRaw = raw.id ?? raw.plan_id;
  if (idRaw === null || idRaw === undefined) return null;
  return {
    id: String(idRaw),
    title: typeof raw.title === "string" ? raw.title : `Рацион #${idRaw}`,
    description: typeof raw.description === "string" ? raw.description : null,
    is_private: typeof raw.is_private === "boolean" ? raw.is_private : undefined,
    user_id: raw.user_id as string | number | undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
    recipes: normalizeRecipes(raw),
    PlanRecipes: Array.isArray(raw.PlanRecipes) ? (raw.PlanRecipes as Array<Record<string, unknown>>) : undefined,
  };
};

class DietPlanService {
  async getPublic(search?: string): Promise<DietPlan[]> {
    const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    const data = await apiClient.get<unknown>(`/diet-plans${query}`);
    return toArray(data).map(normalizePlan).filter((i): i is DietPlan => Boolean(i));
  }

  async getMine(): Promise<DietPlan[]> {
    const data = await apiClient.get<unknown>("/diet-plans/me");
    return toArray(data).map(normalizePlan).filter((i): i is DietPlan => Boolean(i));
  }

  async getById(id: string | number): Promise<DietPlan> {
    const data = await apiClient.get<unknown>(`/diet-plans/${id}`);
    const plan = normalizePlan(data);
    if (!plan) throw new Error("Не удалось прочитать рацион");
    return plan;
  }

  async create(payload: DietPlanPayload): Promise<void> {
    await apiClient.post("/diet-plans", payload);
  }

  async update(id: string | number, payload: Partial<DietPlanPayload>): Promise<void> {
    await apiClient.patch(`/diet-plans/${id}`, payload);
  }

  async remove(id: string | number): Promise<void> {
    await apiClient.delete(`/diet-plans/${id}`);
  }
}

export const dietPlanService = new DietPlanService();

