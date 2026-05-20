"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import FeedCard from "../../components/feed-card/FeedCard";
import LeftPart from "../../components/MainScreen/NavigationLeftPart";
import NotFoundState from "../../components/NotFoundState";
import ScrollToTopButton from "../../components/ScrollToTopButton";
import { authService } from "../../services/authService";
import { followService } from "../../services/followService";
import { favoriteService } from "../../services/favoriteService";
import { Recipe } from "../../services/recipeService";
import { isNotFoundErrorMessage } from "../../utils/errorUtils";

export default function FavoritesContent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const feedColumnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      try {
        if (!authService.isAuthenticated()) {
          router.push("/");
          return;
        }

        const user = await authService.getCurrentUser();
        if (!user) {
          router.push("/");
          return;
        }

        if (cancelled) return;
        setCurrentUserId(user.id);

        const [favoriteRecipes, following] = await Promise.all([
          favoriteService.getFavoriteRecipes(),
          followService.getFollowing(user.id),
        ]);

        if (cancelled) return;
        setRecipes(favoriteRecipes);
        setFollowingIds(new Set(following.map((item) => item.id)));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Ошибка загрузки избранного");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-5">
      <div className="hidden lg:flex lg:w-55.75">
        <Suspense fallback={<div className="text-umami-gray">Загрузка...</div>}>
          <LeftPart />
        </Suspense>
      </div>

      <div className="flex w-full lg:w-169.5">
        <div ref={feedColumnRef} className="flex w-full flex-col gap-4 pb-10">
          <div className="rounded-lg border border-umami-light-gray/50 bg-white p-4">
            <h1 className="font-nunito text-2xl font-bold text-umami-dark-gray">Избранное</h1>
            <p className="mt-1 font-inter text-sm text-umami-gray">Сохраненные рецепты: {recipes.length}</p>
          </div>

          {isLoading && (
            <div className="flex w-full items-center justify-center py-10">
              <div className="text-umami-gray">Загрузка избранного...</div>
            </div>
          )}

          {error && !isLoading && isNotFoundErrorMessage(error) && (
            <NotFoundState
              title="Ошибка 404"
              description="Страница не найдена или была удалена."
              actionHref="/"
              actionLabel="Вернуться на главную"
            />
          )}

          {error && !isLoading && !isNotFoundErrorMessage(error) && (
            <div className="rounded-lg border border-umami-light-gray/50 bg-white p-8 text-center">
              <p className="font-nunito text-lg font-bold text-red-500">Ошибка: {error}</p>
            </div>
          )}

          {!isLoading && !error && recipes.length === 0 && (
            <div className="rounded-lg border border-umami-light-gray/50 bg-white p-8 text-center">
              <p className="font-nunito text-lg font-bold text-umami-gray">В избранном пока пусто</p>
            </div>
          )}

          {!isLoading &&
            !error &&
            recipes.map((recipe, index) => (
              <FeedCard
                key={recipe.id}
                recipe={recipe}
                currentUserId={currentUserId}
                isFollowing={followingIds.has(recipe.user_id)}
                showComments={index === 0}
              />
            ))}
          <ScrollToTopButton anchorRef={feedColumnRef} />
        </div>
      </div>
    </div>
  );
}
