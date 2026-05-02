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
  const searchQuery = searchParams.get("search") || "";
  const showFilters = searchParams.get("filters") === "true";
  const [filters, setFilters] = useState<FilterValues>({});
  
  // Используем рекомендации если нет поиска и фильтров
  const useRecommendations = !searchQuery && Object.keys(filters).length === 0;
  
  const { recipes, loading, error, refetch, updateParams } = useRecipes({ 
    initialParams: { 
      search: searchQuery,
      ...filters
    },
    useRecommendations
  });
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
    setFilters(newFilters);
    updateParams({
      search: searchQuery,
      ...newFilters
    });
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