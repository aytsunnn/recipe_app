"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import FeedCard from "../feed-card/FeedCard";
import { useRecipes } from "../../hooks/useRecipes";
import { authService } from "../../services/authService";
import { followService } from "../../services/followService";
import { userService, User } from "../../services/userService";
import NotFoundState from "../NotFoundState";
import { isNotFoundErrorMessage } from "../../utils/errorUtils";
import { normalizeImageUrl } from "../../utils/imageUrl";
import ScrollToTopButton from "../ScrollToTopButton";
import Link from "next/link";
import Image from "next/image";

const firstFromCsv = (csvValue: string | null) =>
  csvValue ? csvValue.split(",").filter(Boolean)[0] : undefined;
const allFromCsv = (csvValue: string | null) =>
  csvValue ? csvValue.split(",").map((v) => v.trim()).filter(Boolean) : [];

export default function FeedOfPosts() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get("search") || "";
  const kitchenRaw = searchParams?.get("kitchen_id") || null;
  const categoryRaw = searchParams?.get("category_id") || null;
  const celebrationRaw = searchParams?.get("celebration_id") || null;
  const cookingRaw = searchParams?.get("cooking_id") || null;
  const difficultyRaw = searchParams?.get("difficulty") || null;

  const firstKitchenId = firstFromCsv(kitchenRaw);
  const firstCelebrationId = firstFromCsv(celebrationRaw);
  const firstCookingId = firstFromCsv(cookingRaw);
  const firstDifficulty = firstFromCsv(difficultyRaw);

  const kitchenId = firstKitchenId ? parseInt(firstKitchenId, 10) : undefined;
  const celebrationId = firstCelebrationId
    ? parseInt(firstCelebrationId, 10)
    : undefined;
  const cookingId = firstCookingId ? parseInt(firstCookingId, 10) : undefined;
  const difficulty = firstDifficulty || undefined;
  const categoryId = useMemo(() => {
    const ids = allFromCsv(categoryRaw)
      .map((id) => parseInt(id, 10))
      .filter((id) => Number.isFinite(id));
    return ids.length > 0 ? ids : undefined;
  }, [categoryRaw]);

  const useRecommendations =
    !searchQuery &&
    !kitchenId &&
    !(Array.isArray(categoryId) ? categoryId.length > 0 : categoryId) &&
    !celebrationId &&
    !cookingId &&
    !difficulty;

  const {
    recipes,
    loading,
    loadingMore,
    error,
    refetch,
    updateParams,
    loadMore,
    hasMore,
  } = useRecipes({
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

  const [foundUsers, setFoundUsers] = useState<User[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  const categoryDep = categoryRaw || "";

  useEffect(() => {
    Promise.resolve().then(() => {
      updateParams({
        search: searchQuery || undefined,
        kitchen_id: kitchenId,
        category_id: categoryId,
        celebration_id: celebrationId,
        cooking_id: cookingId,
        difficulty,
      });

      if (searchQuery) {
        setIsUsersLoading(true);
        userService
          .search(searchQuery)
          .then(setFoundUsers)
          .catch(console.error)
          .finally(() => setIsUsersLoading(false));
      } else {
        setFoundUsers([]);
      }
    });
  }, [
    updateParams,
    searchQuery,
    kitchenId,
    categoryDep,
    celebrationId,
    cookingId,
    difficulty,
  ]);

  const [currentUserId, setCurrentUserId] = useState<string | undefined>(
    undefined
  );
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const feedColumnRef = useRef<HTMLDivElement | null>(null);

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
    if (isNotFoundErrorMessage(error)) {
      return (
        <div className="w-full py-2">
          <NotFoundState
            title="Ошибка 404"
            description="Страница или данные не найдены."
            actionHref="/"
            actionLabel="Вернуться на главную"
          />
        </div>
      );
    }

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
    <div ref={feedColumnRef} className="w-full flex flex-col gap-2 pb-10">
      {/* Результаты поиска пользователей */}
      {searchQuery && (foundUsers.length > 0 || isUsersLoading) && (
        <div className="bg-white rounded-[20px] border border-umami-light-gray/50 p-5 mb-2 flex flex-col gap-4">
          <h3 className="font-nunito font-bold text-lg text-umami-dark-gray flex items-center gap-2">
            Пользователи
            {isUsersLoading && (
              <span className="text-xs font-normal text-umami-gray animate-pulse">
                (ищем...)
              </span>
            )}
          </h3>
          <div className="flex flex-wrap gap-4">
            {foundUsers.map((user) => (
              <Link
                href={`/users/${user.id}`}
                key={user.id}
                className="flex flex-col items-center gap-2 w-24 group"
              >
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-transparent group-hover:border-umami-green transition-all">
                  <Image
                    src={normalizeImageUrl(user.avatar_url, "/avatar.jpg")}
                    alt={user.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="font-nunito text-xs font-bold text-umami-dark-gray truncate w-full text-center group-hover:text-umami-green">
                  {user.name}
                </p>
                <p className="font-inter text-[10px] text-umami-gray truncate w-full text-center">
                  @{user.username}
                </p>
              </Link>
            ))}
          </div>
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
          {loadingMore
            ? "Загружаем еще..."
            : "Прокрутите вниз, чтобы загрузить еще"}
        </p>
      )}
      <ScrollToTopButton anchorRef={feedColumnRef} />
    </div>
  );
}

