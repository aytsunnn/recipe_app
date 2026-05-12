// app/services/recipeService.ts
import { apiClient } from './api';

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
  ingredients?: Array<{ id: number; quantity: number; note?: string }>;
  steps?: Array<{ description: string; image_url?: string }>;
}

class RecipeService {
  private readonly storageBaseUrl = process.env.NEXT_PUBLIC_STORAGE_URL || '/storage';

  private fixImageUrl(url: string | null): string | null {
    if (!url) return null;

    const trimmed = url.trim();
    if (!trimmed) return null;

    const withPublicHost = trimmed
      .replace('http://127.0.0.1:9000', this.storageBaseUrl)
      .replace('http://localhost:9000', this.storageBaseUrl)
      .replace('http://127.0.0.1:9001', this.storageBaseUrl)
      .replace('http://localhost:9001', this.storageBaseUrl);

    if (withPublicHost.startsWith('http://') || withPublicHost.startsWith('https://')) {
      return withPublicHost;
    }

    if (withPublicHost.startsWith('/vkusno/')) {
      return `${this.storageBaseUrl}${withPublicHost}`;
    }

    if (withPublicHost.startsWith('vkusno/')) {
      return `${this.storageBaseUrl}/${withPublicHost}`;
    }

    if (/^(avatars|recipes|steps|categories|kitchens|celebrations)\//.test(withPublicHost)) {
      return `${this.storageBaseUrl}/vkusno/${withPublicHost}`;
    }

    if (withPublicHost.startsWith('/')) {
      return withPublicHost;
    }

    return null;
  }

  private fixRecipeImages(recipe: Recipe): Recipe {
    const normalizedSteps =
      recipe.Steps?.map((step) => ({
        ...step,
        image_url: this.fixImageUrl(step.image_url ?? null),
      })) ?? recipe.Steps;

    return {
      ...recipe,
      image_url: this.fixImageUrl(recipe.image_url),
      Steps: normalizedSteps,
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

  async getRecommendations(page = 1, limit = 8): Promise<Recipe[]> {
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const recipes = await apiClient.get<Recipe[]>(`/recipes/recommendations?${queryParams.toString()}`);
      return recipes.map(recipe => this.fixRecipeImages(recipe));
    } catch (error) {
      console.error('Ошибка загрузки рекомендаций, показываем общую ленту:', error);
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
        throw new Error('Не удалось получить случайный рецепт');
      }
      const randomIndex = Math.floor(Math.random() * recipes.length);
      return recipes[randomIndex];
    }
  }
}

export const recipeService = new RecipeService();

