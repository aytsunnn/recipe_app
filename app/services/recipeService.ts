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
  Likes: unknown[];
  Categories: unknown[];
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
    
    return apiClient.get<Recipe[]>(endpoint);
  }

  async getById(id: string): Promise<Recipe> {
    return apiClient.get<Recipe>(`/recipes/${id}`);
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
}

export const recipeService = new RecipeService();