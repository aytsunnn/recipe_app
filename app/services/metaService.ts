// app/services/metaService.ts
import { apiClient } from './api';

export interface Kitchen {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Celebration {
  id: string;
  name: string;
}

export interface Cooking {
  id: string;
  name: string;
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

  async getAll() {
    console.log('[MetaService] Загрузка всех метаданных...');
    const [kitchens, categories, celebrations, cookings] = await Promise.all([
      this.getKitchens(),
      this.getCategories(),
      this.getCelebrations(),
      this.getCookings(),
    ]);
    
    return {
      kitchens,
      categories,
      celebrations,
      cookings,
    };
  }
}

export const metaService = new MetaService();
