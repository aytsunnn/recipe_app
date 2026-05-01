"use client";

import FeedCard from "../FeedCard";
import { useRecipes } from "../../hooks/useRecipes";
import { useState, useEffect } from "react";
import { authService } from "../../services/authService";
import { followService } from "../../services/followService";

export default function FeedOfPosts() {
  const { recipes, loading, error, refetch } = useRecipes();
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
            const ids = new Set(following.map((f: any) => f.id));
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