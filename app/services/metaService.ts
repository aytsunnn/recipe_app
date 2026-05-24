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

export interface Unit {
  id: string;
  name: string;
  short_name: string;
  createdAt?: string;
  updatedAt?: string;
}

class MetaService {
  private kitchensCache: Kitchen[] | null = null;
  private categoriesCache: Category[] | null = null;
  private celebrationsCache: Celebration[] | null = null;
  private cookingsCache: Cooking[] | null = null;
  private ingredientsCache: Ingredient[] | null = null;
  private unitsCache: Unit[] | null = null;

  private kitchensPromise: Promise<Kitchen[]> | null = null;
  private categoriesPromise: Promise<Category[]> | null = null;
  private celebrationsPromise: Promise<Celebration[]> | null = null;
  private cookingsPromise: Promise<Cooking[]> | null = null;
  private ingredientsPromise: Promise<Ingredient[]> | null = null;
  private unitsPromise: Promise<Unit[]> | null = null;

  clearCache() {
    this.kitchensCache = null;
    this.categoriesCache = null;
    this.celebrationsCache = null;
    this.cookingsCache = null;
    this.ingredientsCache = null;
    this.unitsCache = null;
  }

  async getKitchens(forceRefresh = false): Promise<Kitchen[]> {
    if (!forceRefresh && this.kitchensCache) return this.kitchensCache;
    if (this.kitchensPromise && !forceRefresh) return this.kitchensPromise;

    this.kitchensPromise = (async () => {
      try {
        console.log('[MetaService] Загрузка кухонь...');
        const data = await apiClient.get<Kitchen[]>('/meta/kitchens');
        this.kitchensCache = data;
        return data;
      } catch (error) {
        console.error('[MetaService] Ошибка загрузки кухонь:', error);
        return [];
      } finally {
        this.kitchensPromise = null;
      }
    })();

    return this.kitchensPromise;
  }

  async getCategories(forceRefresh = false): Promise<Category[]> {
    if (!forceRefresh && this.categoriesCache) return this.categoriesCache;
    if (this.categoriesPromise && !forceRefresh) return this.categoriesPromise;

    this.categoriesPromise = (async () => {
      try {
        console.log('[MetaService] Загрузка категорий...');
        const data = await apiClient.get<Category[]>('/meta/categories');
        this.categoriesCache = data;
        return data;
      } catch (error) {
        console.error('[MetaService] Ошибка загрузки категорий:', error);
        return [];
      } finally {
        this.categoriesPromise = null;
      }
    })();

    return this.categoriesPromise;
  }

  async getCelebrations(forceRefresh = false): Promise<Celebration[]> {
    if (!forceRefresh && this.celebrationsCache) return this.celebrationsCache;
    if (this.celebrationsPromise && !forceRefresh) return this.celebrationsPromise;

    this.celebrationsPromise = (async () => {
      try {
        console.log('[MetaService] Загрузка праздников...');
        const data = await apiClient.get<Celebration[]>('/meta/celebrations');
        this.celebrationsCache = data;
        return data;
      } catch (error) {
        console.error('[MetaService] Ошибка загрузки праздников:', error);
        return [];
      } finally {
        this.celebrationsPromise = null;
      }
    })();

    return this.celebrationsPromise;
  }

  async getCookings(forceRefresh = false): Promise<Cooking[]> {
    if (!forceRefresh && this.cookingsCache) return this.cookingsCache;
    if (this.cookingsPromise && !forceRefresh) return this.cookingsPromise;

    this.cookingsPromise = (async () => {
      try {
        console.log('[MetaService] Загрузка способов приготовления...');
        const data = await apiClient.get<Cooking[]>('/meta/cooking-types');
        this.cookingsCache = data;
        return data;
      } catch (error) {
        console.error('[MetaService] Ошибка загрузки способов приготовления:', error);
        return [];
      } finally {
        this.cookingsPromise = null;
      }
    })();

    return this.cookingsPromise;
  }

  async getIngredients(search?: string, forceRefresh = false): Promise<Ingredient[]> {
    // If searching, do not cache/use cache
    if (search) {
      try {
        const query = `?search=${encodeURIComponent(search)}`;
        return await apiClient.get<Ingredient[]>(`/meta/ingredients${query}`);
      } catch (error) {
        console.error("[MetaService] Ошибка загрузки ингредиентов при поиске:", error);
        return [];
      }
    }

    if (!forceRefresh && this.ingredientsCache) return this.ingredientsCache;
    if (this.ingredientsPromise && !forceRefresh) return this.ingredientsPromise;

    this.ingredientsPromise = (async () => {
      try {
        console.log('[MetaService] Загрузка всех ингредиентов...');
        const data = await apiClient.get<Ingredient[]>('/meta/ingredients');
        this.ingredientsCache = data;
        return data;
      } catch (error) {
        console.error("[MetaService] Ошибка загрузки ингредиентов:", error);
        return [];
      } finally {
        this.ingredientsPromise = null;
      }
    })();

    return this.ingredientsPromise;
  }

  async getUnits(forceRefresh = false): Promise<Unit[]> {
    if (!forceRefresh && this.unitsCache) return this.unitsCache;
    if (this.unitsPromise && !forceRefresh) return this.unitsPromise;

    this.unitsPromise = (async () => {
      try {
        const data = await apiClient.get<Unit[]>('/meta/units');
        this.unitsCache = data;
        return data;
      } catch (error) {
        console.error("[MetaService] Ошибка загрузки единиц измерения:", error);
        return [];
      } finally {
        this.unitsPromise = null;
      }
    })();

    return this.unitsPromise;
  }

  async getAll(forceRefresh = false) {
    console.log('[MetaService] Загрузка всех метаданных...');
    const [kitchens, categories, celebrations, cookings, ingredients, units] = await Promise.all([
      this.getKitchens(forceRefresh),
      this.getCategories(forceRefresh),
      this.getCelebrations(forceRefresh),
      this.getCookings(forceRefresh),
      this.getIngredients(undefined, forceRefresh),
      this.getUnits(forceRefresh),
    ]);

    return {
      kitchens,
      categories,
      celebrations,
      cookings,
      ingredients,
      units,
    };
  }
}

export const metaService = new MetaService();
