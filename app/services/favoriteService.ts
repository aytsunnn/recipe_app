// app/services/favoriteService.ts
import { apiClient } from './api';

export interface Favorite {
  id: string;
  user_id: string;
  recipe_id: string;
  createdAt: string;
}

type FavoriteEntry = Favorite | { id: string; recipe_id?: string };

class FavoriteService {
  async addToFavorites(recipeId: string): Promise<Favorite> {
    return apiClient.post<Favorite>(`/recipes/${recipeId}/favorite`, {
      is_downloaded: false,
    });
  }

  async removeFromFavorites(recipeId: string): Promise<void> {
    return apiClient.delete(`/recipes/${recipeId}/favorite`);
  }

  async getUserFavorites(): Promise<FavoriteEntry[]> {
    return apiClient.get<FavoriteEntry[]>('/favorites');
  }

  async checkIsFavorite(recipeId: string): Promise<boolean> {
    try {
      const favorites = await this.getUserFavorites();
      return favorites.some((fav) => (fav.recipe_id ?? fav.id) === recipeId);
    } catch (error) {
      console.error('Ошибка проверки избранного:', error);
      return false;
    }
  }
}

export const favoriteService = new FavoriteService();
