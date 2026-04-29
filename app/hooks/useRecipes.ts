// app/hooks/useRecipes.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { recipeService, Recipe, GetRecipesParams } from '../services/recipeService';

interface UseRecipesOptions {
  initialParams?: GetRecipesParams;
  autoFetch?: boolean;
}

export function useRecipes(options: UseRecipesOptions = {}) {
  const { initialParams = {}, autoFetch = true } = options;
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<GetRecipesParams>(initialParams);
  
  // Используем ref для отслеживания первого рендера
  const isMounted = useRef(true);
  const isFirstRender = useRef(true);

  const fetchRecipes = useCallback(async (fetchParams?: GetRecipesParams) => {
    try {
      setLoading(true);
      setError(null);
      const data = await recipeService.getAll(fetchParams || params);
      if (isMounted.current) {
        setRecipes(data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [params]);

  const refetch = useCallback(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const updateParams = useCallback((newParams: Partial<GetRecipesParams>) => {
    setParams(prev => ({ ...prev, ...newParams }));
  }, []);

  // Отдельный useEffect для начальной загрузки
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Загрузка при изменении параметров
  useEffect(() => {
    if (autoFetch && !isFirstRender.current) {
      fetchRecipes();
    } else if (autoFetch && isFirstRender.current) {
      isFirstRender.current = false;
      fetchRecipes();
    }
  }, [autoFetch, fetchRecipes, params]);

  return {
    recipes,
    loading,
    error,
    refetch,
    updateParams,
    params,
  };
}