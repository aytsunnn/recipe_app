'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { recipeService, Recipe, GetRecipesParams } from '../services/recipeService';

interface UseRecipesOptions {
  initialParams?: GetRecipesParams;
  autoFetch?: boolean;
  useRecommendations?: boolean;
  pageSize?: number;
}

type RecommendationsCache = {
  recipes: Recipe[];
  loadedPage: number;
  hasMore: boolean;
};

let recommendationsCache: RecommendationsCache | null = null;

type RecipeLikeUpdatedEventDetail = {
  recipeId: string;
  userId: string;
  isLiked: boolean;
};

const RECIPE_LIKE_OVERRIDES_KEY = 'recipe_like_overrides';
const RECIPE_COMMENTS_OVERRIDES_KEY = 'recipe_comments_overrides';

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

const applyLikeOverridesFromStorage = (list: Recipe[]): Recipe[] => {
  if (typeof window === 'undefined') return list;

  try {
    const raw = localStorage.getItem(RECIPE_LIKE_OVERRIDES_KEY);
    if (!raw) return list;
    const parsed = JSON.parse(raw) as Record<string, { userId: string; isLiked: boolean }>;

    return list.map((recipe) => {
      const override = parsed[recipe.id];
      if (!override) return recipe;

      return applyLikeUpdateToRecipes([recipe], {
        recipeId: recipe.id,
        userId: override.userId,
        isLiked: override.isLiked,
      })[0];
    });
  } catch {
    return list;
  }
};

const applyCommentOverridesFromStorage = (list: Recipe[]): Recipe[] => {
  if (typeof window === 'undefined') return list;

  try {
    const raw = localStorage.getItem(RECIPE_COMMENTS_OVERRIDES_KEY);
    if (!raw) return list;
    const parsed = JSON.parse(raw) as Record<string, number>;

    return list.map((recipe) => {
      const overrideCount = parsed[recipe.id];
      if (!Number.isFinite(overrideCount)) return recipe;

      const currentCount = recipe._count?.Comments ?? recipe.Comments?.length ?? 0;
      const nextCount = Math.max(currentCount, Number(overrideCount));
      return {
        ...recipe,
        _count: {
          Likes: recipe._count?.Likes ?? recipe.Likes?.length ?? 0,
          Comments: nextCount,
        },
      };
    });
  } catch {
    return list;
  }
};

const hasActiveParams = (params: GetRecipesParams) =>
  Object.values(params).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  });

const normalizeParams = (params: GetRecipesParams): GetRecipesParams => {
  const normalized: GetRecipesParams = {};

  (Object.keys(params) as Array<keyof GetRecipesParams>).forEach((key) => {
    const value = params[key];
    if (Array.isArray(value)) {
      if (value.length > 0) {
        (normalized as Record<string, unknown>)[key] = value;
      }
      return;
    }
    if (value !== undefined && value !== null && value !== '') {
      (normalized as Record<string, unknown>)[key] = value;
    }
  });

  return normalized;
};

const areParamValuesEqual = (
  a: GetRecipesParams[keyof GetRecipesParams],
  b: GetRecipesParams[keyof GetRecipesParams]
) => {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  }
  return a === b;
};

export function useRecipes(options: UseRecipesOptions = {}) {
  const { initialParams = {}, autoFetch = true, useRecommendations = false, pageSize = 20 } = options;
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<GetRecipesParams>(initialParams);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Используем ref для отслеживания первого рендера
  const isMounted = useRef(true);
  const isFirstRender = useRef(true);

  const fetchRecipesPage = useCallback(async (pageToLoad: number, replace = false, fetchParams?: GetRecipesParams) => {
    try {
      console.log("[useRecipes] fetchRecipesPage called:", {
        pageToLoad,
        replace,
        params,
        fetchParams,
        useRecommendations,
        shouldUseRecommendations: useRecommendations && !hasActiveParams(fetchParams || params)
      });
      if (replace) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      const currentParams = fetchParams || params;
      
      const shouldUseRecommendations = useRecommendations && !hasActiveParams(currentParams);
      let data: Recipe[];

      if (shouldUseRecommendations) {
        if (replace && recommendationsCache && recommendationsCache.recipes.length > 0) {
          if (isMounted.current) {
            setRecipes(
              applyCommentOverridesFromStorage(
                applyLikeOverridesFromStorage(recommendationsCache.recipes)
              )
            );
            setPage(recommendationsCache.loadedPage);
            setHasMore(recommendationsCache.hasMore);
            setLoading(false);
          }
          return;
        }

        const excludeIds = replace ? [] : recipes.map(r => r.id);
        data = await recipeService.getRecommendations(1, pageSize, excludeIds);
      } else {
        data = await recipeService.getAll({
          ...currentParams,
          page: pageToLoad,
          limit: pageSize,
        });
      }
        
      if (isMounted.current) {
        let resolvedRecipes: Recipe[] = [];
        let appendedCount = 0;
        setRecipes((prev) => {
          if (replace) {
            resolvedRecipes = data;
            appendedCount = data.length;
          } else {
            const existingIds = new Set(prev.map((item) => item.id));
            const nextChunk = data.filter((item) => !existingIds.has(item.id));
            appendedCount = nextChunk.length;
            resolvedRecipes = [...prev, ...nextChunk];
          }
          return applyCommentOverridesFromStorage(
            applyLikeOverridesFromStorage(resolvedRecipes)
          );
        });
        const nextHasMore = replace
          ? data.length >= pageSize
          : data.length >= pageSize && appendedCount > 0;
        setHasMore(nextHasMore);
        setPage(pageToLoad);

        if (shouldUseRecommendations) {
          recommendationsCache = {
            recipes: resolvedRecipes,
            loadedPage: pageToLoad,
            hasMore: nextHasMore,
          };
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [params, useRecommendations, pageSize]);

  const refetch = useCallback(() => {
    setHasMore(true);
    fetchRecipesPage(1, true);
  }, [fetchRecipesPage]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    void fetchRecipesPage(page + 1, false);
  }, [fetchRecipesPage, hasMore, loading, loadingMore, page]);

  const updateParams = useCallback((newParams: Partial<GetRecipesParams>) => {
    console.log("[useRecipes] updateParams called with:", newParams);
    setParams((prev) => {
      const merged = normalizeParams({ ...prev, ...newParams });

      const changed = Object.keys(merged).some((key) => {
        const typedKey = key as keyof GetRecipesParams;
        return !areParamValuesEqual(merged[typedKey], prev[typedKey]);
      });
      const removed = (Object.keys(prev) as Array<keyof GetRecipesParams>).some(
        (key) => !(key in merged)
      );

      console.log("[useRecipes] updateParams changed check:", { changed, removed, prev, merged });

      if (!changed && !removed) return prev;

      if (hasActiveParams(merged)) {
        recommendationsCache = null;
      }

      return merged;
    });
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
    console.log("[useRecipes] fetch useEffect triggered:", { autoFetch, hasFetchRecipesPage: !!fetchRecipesPage });
    if (!autoFetch) return;
    
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    
    Promise.resolve().then(() => {
      setHasMore(true);
      fetchRecipesPage(1, true);
    });
  }, [autoFetch, fetchRecipesPage]);

  useEffect(() => {
    const handleRecipeLikeUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<RecipeLikeUpdatedEventDetail>;
      if (!customEvent.detail) return;

      setRecipes((prev) => applyLikeUpdateToRecipes(prev, customEvent.detail));
      if (recommendationsCache) {
        recommendationsCache = {
          ...recommendationsCache,
          recipes: applyLikeUpdateToRecipes(recommendationsCache.recipes, customEvent.detail),
        };
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

  useEffect(() => {
    const handleRecipeCommentsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ recipeId: string; commentsCount: number }>;
      if (!customEvent.detail) return;
      const { recipeId, commentsCount } = customEvent.detail;

      const applyCommentsUpdate = (list: Recipe[]) =>
        list.map((recipe) => {
          if (recipe.id !== recipeId) return recipe;
          return {
            ...recipe,
            _count: {
              Likes: recipe._count?.Likes ?? recipe.Likes?.length ?? 0,
              Comments: Math.max(0, commentsCount),
            },
          };
        });

      setRecipes((prev) => applyCommentsUpdate(prev));
      if (recommendationsCache) {
        recommendationsCache = {
          ...recommendationsCache,
          recipes: applyCommentsUpdate(recommendationsCache.recipes),
        };
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('recipe-comments-updated', handleRecipeCommentsUpdated);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('recipe-comments-updated', handleRecipeCommentsUpdated);
      }
    };
  }, []);

  return {
    recipes,
    loading,
    error,
    refetch,
    loadMore,
    hasMore,
    loadingMore,
    updateParams,
    params,
  };
}

