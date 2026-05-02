// app/services/favoriteService.ts
import { apiClient } from './api';

export interface Favorite {
  id: string;
  user_id: string;
  recipe_id: string;
  createdAt: string;
}

class FavoriteService {
  // Добавить в избранное
  async addToFavorites(recipeId: string): Promise<Favorite> {
    return apiClient.post<Favorite>(`/favorites`, { recipe_id: recipeId });
  }

  // Удалить из избранного
  async removeFromFavorites(recipeId: string): Promise<void> {
    return apiClient.delete(`/favorites/${recipeId}`);
  }

  // Получить избранные рецепты пользователя
  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return apiClient.get<Favorite[]>(`/users/${userId}/favorites`);
  }

  // Проверить, добавлен ли рецепт в избранное
  async checkIsFavorite(recipeId: string): Promise<boolean> {
    try {
      const favorites = await apiClient.get<Favorite[]>('/favorites');
      return favorites.some(fav => fav.recipe_id === recipeId);
    } catch (error) {
      console.error('Ошибка проверки избранного:', error);
      return false;
    }
  }
}

export const favoriteService = new FavoriteService();
