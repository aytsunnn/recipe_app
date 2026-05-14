// app/services/recipeService.ts
import { apiClient } from './api';
import { normalizeImageUrl } from '../utils/imageUrl';

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description: string;
  difficulty: string;
  image_url: string | null;
  is_private: boolean;
  kitchen_id: string | null;
  celebration_id: string | null;
  cooking_id: string | null;
  portion: number;
  calorific: number | null;
  proteins?: number | null;
  fats?: number | null;
  carbohydrates?: number | null;
  cooking_time: number;
  createdAt: string;
  updatedAt: string;
  User: {
    id: string;
    username: string;
    name: string;
    avatar_url: string | null;
  };
  Kitchen: {
    id: string;
    name: string;
  } | null;
  Celebration?: {
    id: string;
    name: string;
  } | null;
  TypeCooking?: {
    id: string;
    name: string;
  } | null;
  Ingredients?: Array<{
    id: string;
    name: string;
    RecipeIngredient?: {
      quantity?: string | number | null;
      note?: string | null;
    };
    Unit?: {
      id: string;
      name: string;
      short_name?: string | null;
    } | null;
    unit_of_measurement?: string | null;
  }>;
  Steps?: Array<{
    id: string;
    recipe_id?: string;
    step_number?: number | null;
    description?: string | null;
    image_url?: string | null;
    createdAt?: string;
    updatedAt?: string;
  }>;
  Likes: Array<{ id: string; user_id: string }>;
  Comments?: Array<{ id: string }>;
  Categories: unknown[];
  _count?: {
    Likes: number;
    Comments: number;
  };
  personal_note?: string | null;
  total_reviews?: number | string | null;
  comments_count?: number | string | null;
  is_ai_pfc?: boolean | null;
  parsed_from_url?: boolean | null;
  source_url?: string | null;
}

export interface GetRecipesParams {
  search?: string;
  user_id?: string;
  kitchen_id?: number;
  celebration_id?: number;
  cooking_id?: number;
  category_id?: number;
  difficulty?: string;
  is_private?: boolean;
  page?: number;
  limit?: number;
}

export interface RecipeMutationData {
  title?: string;
  description?: string;
  difficulty?: string;
  image_url?: string | null;
  is_private?: boolean;
  kitchen_id?: number | null;
  celebration_id?: number | null;
  cooking_id?: number | null;
  portion?: number;
  calorific?: number | null;
  cooking_time?: number;
  proteins?: number;
  fats?: number;
  carbohydrates?: number;
  categories?: number[];
  ingredients?: Array<{
    id: number;
    quantity: number;
    unit_of_measurement?: string;
    note?: string;
  }>;
  steps?: Array<{ description: string; image_url?: string }>;
}

class RecipeService {
  private fixImageUrl(url: string | null): string | null {
    if (!url) return null;
    const normalized = normalizeImageUrl(url, "");
    return normalized || null;
  }

  private fixRecipeImages(recipe: Recipe): Recipe {
    const normalizedSteps =
      recipe.Steps?.map((step) => ({
        ...step,
        image_url: this.fixImageUrl(step.image_url ?? null),
      })) ?? recipe.Steps;

    const likesCountFromArray = Array.isArray(recipe.Likes)
      ? recipe.Likes.length
      : 0;
    const commentsCountRaw =
      (typeof recipe.total_reviews === "string"
        ? Number(recipe.total_reviews)
        : recipe.total_reviews) ??
      (typeof recipe.comments_count === "string"
        ? Number(recipe.comments_count)
        : recipe.comments_count) ??
      recipe._count?.Comments ??
      (Array.isArray(recipe.Comments) ? recipe.Comments.length : 0);
    const commentsCount = Number.isFinite(Number(commentsCountRaw))
      ? Number(commentsCountRaw)
      : 0;

    return {
      ...recipe,
      image_url: this.fixImageUrl(recipe.image_url),
      Steps: normalizedSteps,
      _count: {
        Likes: recipe._count?.Likes ?? likesCountFromArray,
        Comments: commentsCount,
      },
      User: {
        ...recipe.User,
        avatar_url: this.fixImageUrl(recipe.User.avatar_url),
      },
    };
  }

  async getAll(params?: GetRecipesParams): Promise<Recipe[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const queryString = queryParams.toString();
    const endpoint = `/recipes${queryString ? `?${queryString}` : ''}`;

    const recipes = await apiClient.get<Recipe[]>(endpoint);
    return recipes.map(recipe => this.fixRecipeImages(recipe));
  }

  async getById(id: string): Promise<Recipe> {
    const recipe = await apiClient.get<Recipe>(`/recipes/${id}`);
    return this.fixRecipeImages(recipe);
  }

  async create(data: RecipeMutationData): Promise<Recipe> {
    return apiClient.post<Recipe>('/recipes', data);
  }

  async update(id: string, data: RecipeMutationData): Promise<Recipe> {
    return apiClient.put<Recipe>(`/recipes/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/recipes/${id}`);
  }

  async updatePersonalNote(id: string, note: string): Promise<void> {
    await apiClient.patch<unknown>(`/recipes/${id}/personal-note`, { note });
  }

  async getRecommendations(page = 1, limit = 8): Promise<Recipe[]> {
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const recipes = await apiClient.get<Recipe[]>(`/recipes/recommendations?${queryParams.toString()}`);
      return recipes.map(recipe => this.fixRecipeImages(recipe));
    } catch (error) {
      console.error('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё СЂРµРєРѕРјРµРЅРґР°С†РёР№, РїРѕРєР°Р·С‹РІР°РµРј РѕР±С‰СѓСЋ Р»РµРЅС‚Сѓ:', error);
      return this.getAll({ page, limit });
    }
  }

  async getRandom(): Promise<Recipe> {
    try {
      const recipe = await apiClient.get<Recipe>('/recipes/random');
      return this.fixRecipeImages(recipe);
    } catch {
      const recipes = await this.getAll({ page: 1, limit: 50 });
      if (!recipes.length) {
        throw new Error('РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ СЃР»СѓС‡Р°Р№РЅС‹Р№ СЂРµС†РµРїС‚');
      }
      const randomIndex = Math.floor(Math.random() * recipes.length);
      return recipes[randomIndex];
    }
  }
}

export const recipeService = new RecipeService();



