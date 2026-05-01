// app/services/likeService.ts
import { apiClient } from './api';

export interface Like {
  id: string;
  user_id: string;
  recipe_id: string;
  createdAt: string;
}

class LikeService {
  // Поставить лайк
  async create(recipeId: string): Promise<Like> {
    return apiClient.post<Like>(`/recipes/${recipeId}/like`);
  }

  // Убрать лайк
  async delete(recipeId: string): Promise<void> {
    return apiClient.delete(`/recipes/${recipeId}/like`);
  }

  // Получить лайки рецепта
  async getByRecipe(recipeId: string): Promise<Like[]> {
    return apiClient.get<Like[]>(`/recipes/${recipeId}/likes`);
  }
}

export const likeService = new LikeService();
