// app/services/favoriteService.ts
import { apiClient } from './api';
import { Recipe, recipeService } from './recipeService';

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

  async getFavoriteRecipes(): Promise<Recipe[]> {
    const payload = await apiClient.get<unknown[]>('/favorites');
    if (!Array.isArray(payload)) return [];

    const recipeLike = payload.filter((item): item is Recipe => {
      if (!item || typeof item !== 'object') return false;
      const maybe = item as Record<string, unknown>;
      return typeof maybe.title === 'string' && typeof maybe.description === 'string';
    });

    if (recipeLike.length > 0) {
      return recipeLike;
    }

    const recipeIds = payload
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const entry = item as Record<string, unknown>;
        const rawId = entry.recipe_id ?? entry.id;
        return typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : null;
      })
      .filter((id): id is string => Boolean(id));

    const recipes = await Promise.all(
      recipeIds.map(async (id) => {
        try {
          return await recipeService.getById(id);
        } catch {
          return null;
        }
      })
    );

    return recipes.filter((recipe): recipe is Recipe => recipe !== null);
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
