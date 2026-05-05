"use client";

import { useEffect, useState } from "react";
import FeedCard from "../../components/FeedCard";
import LeftPart from "../../components/MainScreen/NavigationLeftPart";
import RightPart from "../../components/MainScreen/NewsRightPart";
import { authService } from "../../services/authService";
import { followService } from "../../services/followService";
import { Recipe, recipeService } from "../../services/recipeService";

export default function RandomRecipePage() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [isFollowing, setIsFollowing] = useState(false);

  const loadRandom = async () => {
    try {
      setLoading(true);
      setError(null);
      const nextRecipe = await recipeService.getRandom();
      setRecipe(nextRecipe);

      if (authService.isAuthenticated()) {
        const me = await authService.getCurrentUser();
        setCurrentUserId(me?.id);
        if (me?.id) {
          const following = await followService.getFollowing(me.id);
          setIsFollowing(following.some((u) => u.id === nextRecipe.user_id));
        }
      } else {
        setCurrentUserId(undefined);
        setIsFollowing(false);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить случайный рецепт");
      setRecipe(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRandom();
  }, []);

  return (
    <div className="w-full gap-5 flex flex-row">
      <div className="hidden w-55.75 lg:flex">
        <LeftPart />
      </div>

      <div className="w-full lg:w-169.5">
        <div className="mb-4 rounded-lg border border-umami-light-gray/50 bg-white p-4">
          <div className="flex items-center justify-between">
            <h1 className="font-nunito text-2xl font-bold text-umami-dark-gray">Случайный рецепт</h1>
            <button
              type="button"
              onClick={() => void loadRandom()}
              className="rounded-full bg-umami-green px-4 py-2 font-inter text-sm font-medium text-white transition-colors hover:bg-[#6A805E]"
            >
              Другой рецепт
            </button>
          </div>
        </div>

        {loading && <div className="text-umami-gray">Загрузка...</div>}
        {error && !loading && (
          <div className="rounded-lg border border-umami-light-gray/50 bg-white p-6 text-red-500">{error}</div>
        )}
        {!loading && !error && recipe && (
          <FeedCard recipe={recipe} currentUserId={currentUserId} isFollowing={isFollowing} showComments />
        )}
      </div>

      <div className="hidden w-63.75 lg:flex">
        <RightPart />
      </div>
    </div>
  );
}
