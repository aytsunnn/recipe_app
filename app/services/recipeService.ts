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
  kitchen_id?: number;
  celebration_id?: number;
  cooking_id?: number;
  category_id?: number;
  difficulty?: string;
  is_private?: boolean;
  page?: number;
  limit?: number;
}

class RecipeService {
  // Заменяет localhost URL на публичный адрес
  private fixImageUrl(url: string | null): string | null {
    if (!url) return null;
    const fixed = url.replace('http://127.0.0.1:9000', 'http://188.233.238.70:9000');
    if (fixed.startsWith('http://') || fixed.startsWith('https://') || fixed.startsWith('/')) {
      return fixed;
    }
    return null;
  }

  // Исправляет URL изображений в рецепте
  private fixRecipeImages(recipe: Recipe): Recipe {
    return {
      ...recipe,
      image_url: this.fixImageUrl(recipe.image_url),
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

  async create(data: Partial<Recipe>): Promise<Recipe> {
    return apiClient.post<Recipe>('/recipes', data);
  }

  async update(id: string, data: Partial<Recipe>): Promise<Recipe> {
    return apiClient.put<Recipe>(`/recipes/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    return apiClient.delete(`/recipes/${id}`);
  }

  async getRecommendations(): Promise<Recipe[]> {
    try {
      const recipes = await apiClient.get<Recipe[]>('/recipes/recommendations');
      return recipes.map(recipe => this.fixRecipeImages(recipe));
    } catch (error) {
      console.error('Ошибка загрузки рекомендаций, показываем общую ленту:', error);
      return this.getAll();
    }
  }
}

export const recipeService = new RecipeService();
