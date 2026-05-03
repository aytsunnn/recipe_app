'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { recipeService, Recipe, GetRecipesParams } from '../services/recipeService';

interface UseRecipesOptions {
  initialParams?: GetRecipesParams;
  autoFetch?: boolean;
  useRecommendations?: boolean;
}

let recommendationsCache: Recipe[] | null = null;

const hasActiveParams = (params: GetRecipesParams) =>
  Object.values(params).some((value) => value !== undefined && value !== null && value !== '');

export function useRecipes(options: UseRecipesOptions = {}) {
  const { initialParams = {}, autoFetch = true, useRecommendations = false } = options;
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<GetRecipesParams>(initialParams);
  
  // РСЃРїРѕР»СЊР·СѓРµРј ref РґР»СЏ РѕС‚СЃР»РµР¶РёРІР°РЅРёСЏ РїРµСЂРІРѕРіРѕ СЂРµРЅРґРµСЂР°
  const isMounted = useRef(true);
  const isFirstRender = useRef(true);

  const fetchRecipes = useCallback(async (fetchParams?: GetRecipesParams) => {
    try {
      setLoading(true);
      setError(null);
      const currentParams = fetchParams || params;
      
      const shouldUseRecommendations = useRecommendations && !hasActiveParams(currentParams);
      let data: Recipe[];

      if (shouldUseRecommendations) {
        if (recommendationsCache) {
          data = recommendationsCache;
        } else {
          data = await recipeService.getRecommendations();
          recommendationsCache = data;
        }
      } else {
        data = await recipeService.getAll(currentParams);
      }
        
      if (isMounted.current) {
        setRecipes(data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'РџСЂРѕРёР·РѕС€Р»Р° РѕС€РёР±РєР°');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [params, useRecommendations]);

  const refetch = useCallback(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const updateParams = useCallback((newParams: Partial<GetRecipesParams>) => {
    setParams(prev => ({ ...prev, ...newParams }));
  }, []);

  // РћС‚РґРµР»СЊРЅС‹Р№ useEffect РґР»СЏ РЅР°С‡Р°Р»СЊРЅРѕР№ Р·Р°РіСЂСѓР·РєРё
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Р—Р°РіСЂСѓР·РєР° РїСЂРё РёР·РјРµРЅРµРЅРёРё РїР°СЂР°РјРµС‚СЂРѕРІ
  useEffect(() => {
    if (!autoFetch) return;
    
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    
    fetchRecipes();
  }, [autoFetch, fetchRecipes]);

  return {
    recipes,
    loading,
    error,
    refetch,
    updateParams,
    params,
  };
}

