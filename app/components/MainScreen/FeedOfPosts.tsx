"use client";

import FeedCard from "../FeedCard";
import { useRecipes } from "../../hooks/useRecipes";
import { useState, useEffect } from "react";
import { authService } from "../../services/authService";
import { followService } from "../../services/followService";
import { useSearchParams } from "next/navigation";
import FiltersPanel, { FilterValues } from "./FiltersPanel";

export default function FeedOfPosts() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get("search") || "";
  const showFilters = searchParams?.get("filters") === "true";
  
  const currentFilters: FilterValues = {};
  const kitchenId = searchParams?.get("kitchen_id");
  const categoryIds = searchParams?.get("category_id");
  const celebrationId = searchParams?.get("celebration_id");
  const cookingId = searchParams?.get("cooking_id");
  const difficulty = searchParams?.get("difficulty");
  
  if (kitchenId) currentFilters.kitchen_id = parseInt(kitchenId);
  // Для множественного выбора категорий берем первую (API поддерживает только одну)
  if (categoryIds) {
    const firstCategoryId = categoryIds.split(',')[0];
    currentFilters.category_id = parseInt(firstCategoryId);
  }
  if (celebrationId) currentFilters.celebration_id = parseInt(celebrationId);
  if (cookingId) currentFilters.cooking_id = parseInt(cookingId);
  if (difficulty) currentFilters.difficulty = difficulty;
  
  const useRecommendations = !searchQuery && Object.keys(currentFilters).length === 0;
  
  const { recipes, loading, error, refetch, updateParams } = useRecipes({ 
    initialParams: { 
      search: searchQuery || undefined,
      ...currentFilters
    },
    useRecommendations
  });

  // Обновляем параметры запроса при изменении URL
  useEffect(() => {
    updateParams({
      search: searchQuery || undefined,
      kitchen_id: currentFilters.kitchen_id || undefined,
      category_id: currentFilters.category_id || undefined,
      celebration_id: currentFilters.celebration_id || undefined,
      cooking_id: currentFilters.cooking_id || undefined,
      difficulty: currentFilters.difficulty || undefined,
    });
  }, [
    searchParams,
    updateParams,
    searchQuery,
    currentFilters.kitchen_id,
    currentFilters.category_id,
    currentFilters.celebration_id,
    currentFilters.cooking_id,
    currentFilters.difficulty
  ]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadUser = async () => {
      if (authService.isAuthenticated()) {
        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUserId(user.id);
          
          // Загружаем список подписок
          try {
            const following = await followService.getFollowing(user.id);
            console.log('Following users:', following);
            const ids = new Set(following.map((f: { id: string }) => f.id));
            console.log('Following IDs:', Array.from(ids));
            setFollowingIds(ids);
          } catch (error) {
            console.error("Ошибка при загрузке подписок:", error);
          }
        }
      }
    };

    loadUser();
  }, []);

  const handleApplyFilters = (newFilters: FilterValues) => {
    // URL уже обновляется в FiltersPanel.tsx,
    // useEffect выше отреагирует на изменение параметров и вызовет updateParams
  };

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
    <div className="w-full flex flex-col gap-4">
      {/* Блок фильтров - показывается только когда filters=true */}
      {showFilters && <FiltersPanel onApplyFilters={handleApplyFilters} />}

      {searchQuery && (
        <div className="bg-white rounded-lg border border-umami-light-gray/50 p-4">
          <p className="font-nunito font-bold text-lg text-umami-dark-gray">
            Результаты поиска: &quot;{searchQuery}&quot;
          </p>
          <p className="font-inter text-sm text-umami-gray">
            Найдено рецептов: {recipes.length}
          </p>
        </div>
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
        console.log(`Recipe ${recipe.id} by user ${recipe.user_id}: isFollowing=${isFollowing}`);
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
    </div>
  );
}