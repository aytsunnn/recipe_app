'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { recipeService, Recipe, GetRecipesParams } from '../services/recipeService';

interface UseRecipesOptions {
  initialParams?: GetRecipesParams;
  autoFetch?: boolean;
  useRecommendations?: boolean;
}

let recommendationsCache: Recipe[] | null = null;

type RecipeLikeUpdatedEventDetail = {
  recipeId: string;
  userId: string;
  isLiked: boolean;
};

const applyLikeUpdateToRecipes = (
  list: Recipe[],
  { recipeId, userId, isLiked }: RecipeLikeUpdatedEventDetail
): Recipe[] =>
  list.map((recipe) => {
    if (recipe.id !== recipeId) return recipe;

    const currentLikes = recipe.Likes || [];
    const hasUserLike = currentLikes.some((like) => like.user_id === userId);

    let nextLikes = currentLikes;
    if (isLiked && !hasUserLike) {
      nextLikes = [...currentLikes, { id: `local-${userId}-${recipeId}`, user_id: userId }];
    } else if (!isLiked && hasUserLike) {
      nextLikes = currentLikes.filter((like) => like.user_id !== userId);
    }

    const nextLikesCount = recipe._count?.Likes ?? currentLikes.length;
    const resolvedCount = isLiked
      ? hasUserLike
        ? nextLikesCount
        : nextLikesCount + 1
      : hasUserLike
        ? Math.max(0, nextLikesCount - 1)
        : nextLikesCount;

    return {
      ...recipe,
      Likes: nextLikes,
      _count: {
        Likes: resolvedCount,
        Comments: recipe._count?.Comments ?? recipe.Comments?.length ?? 0,
      },
    };
  });

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

  useEffect(() => {
    const handleRecipeLikeUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<RecipeLikeUpdatedEventDetail>;
      if (!customEvent.detail) return;

      setRecipes((prev) => applyLikeUpdateToRecipes(prev, customEvent.detail));
      if (recommendationsCache) {
        recommendationsCache = applyLikeUpdateToRecipes(recommendationsCache, customEvent.detail);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('recipe-like-updated', handleRecipeLikeUpdated);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('recipe-like-updated', handleRecipeLikeUpdated);
      }
    };
  }, []);

  return {
    recipes,
    loading,
    error,
    refetch,
    updateParams,
    params,
  };
}

