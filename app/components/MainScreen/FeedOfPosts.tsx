"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import FeedCard from "../FeedCard";
import FiltersPanel, { FilterValues } from "./FiltersPanel";
import { useRecipes } from "../../hooks/useRecipes";
import { authService } from "../../services/authService";
import { followService } from "../../services/followService";

const firstFromCsv = (csvValue: string | null) =>
  csvValue ? csvValue.split(",").filter(Boolean)[0] : undefined;

export default function FeedOfPosts() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get("search") || "";
  const showFilters = searchParams?.get("filters") === "true";

  const firstKitchenId = firstFromCsv(searchParams?.get("kitchen_id") || null);
  const firstCategoryId = firstFromCsv(searchParams?.get("category_id") || null);
  const firstCelebrationId = firstFromCsv(searchParams?.get("celebration_id") || null);
  const firstCookingId = firstFromCsv(searchParams?.get("cooking_id") || null);
  const firstDifficulty = firstFromCsv(searchParams?.get("difficulty") || null);

  const kitchenId = firstKitchenId ? parseInt(firstKitchenId) : undefined;
  const categoryId = firstCategoryId ? parseInt(firstCategoryId) : undefined;
  const celebrationId = firstCelebrationId ? parseInt(firstCelebrationId) : undefined;
  const cookingId = firstCookingId ? parseInt(firstCookingId) : undefined;
  const difficulty = firstDifficulty || undefined;

  const useRecommendations =
    !searchQuery && !kitchenId && !categoryId && !celebrationId && !cookingId && !difficulty;

  const { recipes, loading, loadingMore, error, refetch, updateParams, loadMore, hasMore } = useRecipes({
    initialParams: {
      search: searchQuery || undefined,
      kitchen_id: kitchenId,
      category_id: categoryId,
      celebration_id: celebrationId,
      cooking_id: cookingId,
      difficulty,
    },
    useRecommendations,
  });

  useEffect(() => {
    updateParams({
      search: searchQuery || undefined,
      kitchen_id: kitchenId,
      category_id: categoryId,
      celebration_id: celebrationId,
      cooking_id: cookingId,
      difficulty,
    });
  }, [
    updateParams,
    searchQuery,
    kitchenId,
    categoryId,
    celebrationId,
    cookingId,
    difficulty,
  ]);

  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      if (!authService.isAuthenticated()) return;

      const user = await authService.getCurrentUser();
      if (!user) return;

      setCurrentUserId(user.id);
      try {
        const following = await followService.getFollowing(user.id);
        const ids = new Set(following.map((f: { id: string }) => f.id));
        setFollowingIds(ids);
      } catch (loadError) {
        console.error("Ошибка при загрузке подписок:", loadError);
      }
    };

    loadUser();
  }, []);

  const handleApplyFilters = (newFilters: FilterValues) => {
    void newFilters;
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        loadMore();
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-10">
        <div className="text-umami-gray">Загрузка рецептов...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col justify-center items-center py-10 gap-4">
        <div className="text-red-500">Ошибка: {error}</div>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-umami-green text-white rounded-full hover:bg-[#6A805E] transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {showFilters && (
        <FiltersPanel onApplyFilters={handleApplyFilters} resultsCount={recipes.length} />
      )}

      {recipes.length === 0 && !loading && (
        <div className="bg-white rounded-lg border border-umami-light-gray/50 p-8 text-center">
          <p className="font-nunito font-bold text-lg text-umami-gray">
            {searchQuery ? "Ничего не найдено" : "Нет рецептов"}
          </p>
        </div>
      )}

      {recipes.map((recipe, index) => {
        const isFollowing = followingIds.has(recipe.user_id);
        return (
          <FeedCard
            key={recipe.id}
            recipe={recipe}
            showComments={index === 0}
            currentUserId={currentUserId}
            isFollowing={isFollowing}
          />
        );
      })}

      <div ref={sentinelRef} className="h-1 w-full" />
      {hasMore && (
        <p className="py-2 text-center text-sm text-umami-gray">
          {loadingMore ? "Загружаем еще..." : "Прокрутите вниз, чтобы загрузить еще"}
        </p>
      )}
    </div>
  );
}
