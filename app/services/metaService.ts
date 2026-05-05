// app/services/metaService.ts
import { apiClient } from './api';

export interface Kitchen {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  image_url?: string | null;
}

export interface Celebration {
  id: string;
  name: string;
}

export interface Cooking {
  id: string;
  name: string;
}

export interface Ingredient {
  id: string;
  name: string;
  unit_of_measurement: string;
  description?: string;
}

class MetaService {
  async getKitchens(): Promise<Kitchen[]> {
    try {
      console.log('[MetaService] Загрузка кухонь...');
      const data = await apiClient.get<Kitchen[]>('/meta/kitchens');
      console.log('[MetaService] Кухни загружены:', data);
      return data;
    } catch (error) {
      console.error('[MetaService] Ошибка загрузки кухонь:', error);
      return [];
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      console.log('[MetaService] Загрузка категорий...');
      const data = await apiClient.get<Category[]>('/meta/categories');
      console.log('[MetaService] Категории загружены:', data);
      return data;
    } catch (error) {
      console.error('[MetaService] Ошибка загрузки категорий:', error);
      return [];
    }
  }

  async getCelebrations(): Promise<Celebration[]> {
    try {
      console.log('[MetaService] Загрузка праздников...');
      const data = await apiClient.get<Celebration[]>('/meta/celebrations');
      console.log('[MetaService] Праздники загружены:', data);
      return data;
    } catch (error) {
      console.error('[MetaService] Ошибка загрузки праздников:', error);
      return [];
    }
  }

  async getCookings(): Promise<Cooking[]> {
    try {
      console.log('[MetaService] Загрузка способов приготовления...');
      const data = await apiClient.get<Cooking[]>('/meta/cooking-types');
      console.log('[MetaService] Способы приготовления загружены:', data);
      return data;
    } catch (error) {
      console.error('[MetaService] Ошибка загрузки способов приготовления:', error);
      return [];
    }
  }

  async getIngredients(search?: string): Promise<Ingredient[]> {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await apiClient.get<Ingredient[]>(`/meta/ingredients${query}`);
      return data;
    } catch (error) {
      console.error("[MetaService] Ошибка загрузки ингредиентов:", error);
      return [];
    }
  }

  async getAll() {
    console.log('[MetaService] Загрузка всех метаданных...');
    const [kitchens, categories, celebrations, cookings, ingredients] = await Promise.all([
      this.getKitchens(),
      this.getCategories(),
      this.getCelebrations(),
      this.getCookings(),
      this.getIngredients(),
    ]);
    
    return {
      kitchens,
      categories,
      celebrations,
      cookings,
      ingredients,
    };
  }
}

export const metaService = new MetaService();
