"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import FeedCard from "../FeedCard";
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

export default function FeedOfPosts() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams?.get("search") || "";
  const firstKitchenId = firstFromCsv(searchParams?.get("kitchen_id") || null);
  const firstCategoryId = firstFromCsv(
    searchParams?.get("category_id") || null
  );
  const firstCelebrationId = firstFromCsv(
    searchParams?.get("celebration_id") || null
  );
  const firstCookingId = firstFromCsv(searchParams?.get("cooking_id") || null);
  const firstDifficulty = firstFromCsv(searchParams?.get("difficulty") || null);

  const kitchenId = firstKitchenId ? parseInt(firstKitchenId) : undefined;
  const categoryId = firstCategoryId ? parseInt(firstCategoryId) : undefined;
  const celebrationId = firstCelebrationId
    ? parseInt(firstCelebrationId)
    : undefined;
  const cookingId = firstCookingId ? parseInt(firstCookingId) : undefined;
  const difficulty = firstDifficulty || undefined;

  const useRecommendations =
    !searchQuery &&
    !kitchenId &&
    !categoryId &&
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

  useEffect(() => {
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
  }, [
    updateParams,
    searchQuery,
    kitchenId,
    categoryId,
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
        console.error("РћС€РёР±РєР° РїСЂРё Р·Р°РіСЂСѓР·РєРµ РїРѕРґРїРёСЃРѕРє:", loadError);
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
        <div className="text-umami-gray">Р—Р°РіСЂСѓР·РєР° СЂРµС†РµРїС‚РѕРІ...</div>
      </div>
    );
  }

  if (error) {
    if (isNotFoundErrorMessage(error)) {
      return (
        <div className="w-full py-2">
          <NotFoundState
            title="РћС€РёР±РєР° 404"
            description="РЎС‚СЂР°РЅРёС†Р° РёР»Рё РґР°РЅРЅС‹Рµ РЅРµ РЅР°Р№РґРµРЅС‹."
            actionHref="/"
            actionLabel="Р’РµСЂРЅСѓС‚СЊСЃСЏ РЅР° РіР»Р°РІРЅСѓСЋ"
          />
        </div>
      );
    }

    return (
      <div className="w-full flex flex-col justify-center items-center py-10 gap-4">
        <div className="text-red-500">РћС€РёР±РєР°: {error}</div>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-umami-green text-white rounded-full hover:bg-[#6A805E] transition-colors"
        >
          РџРѕРІС‚РѕСЂРёС‚СЊ
        </button>
      </div>
    );
  }

  return (
    <div ref={feedColumnRef} className="w-full flex flex-col gap-2">
      {/* Р РµР·СѓР»СЊС‚Р°С‚С‹ РїРѕРёСЃРєР° РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ */}
      {searchQuery && (foundUsers.length > 0 || isUsersLoading) && (
        <div className="bg-white rounded-[20px] border border-umami-light-gray/50 p-5 mb-2 flex flex-col gap-4">
          <h3 className="font-nunito font-bold text-lg text-umami-dark-gray flex items-center gap-2">
            РџРѕР»СЊР·РѕРІР°С‚РµР»Рё
            {isUsersLoading && (
              <span className="text-xs font-normal text-umami-gray animate-pulse">
                (РёС‰РµРј...)
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
            {searchQuery ? "РќРёС‡РµРіРѕ РЅРµ РЅР°Р№РґРµРЅРѕ" : "РќРµС‚ СЂРµС†РµРїС‚РѕРІ"}
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
            ? "Р—Р°РіСЂСѓР¶Р°РµРј РµС‰Рµ..."
            : "РџСЂРѕРєСЂСѓС‚РёС‚Рµ РІРЅРёР·, С‡С‚РѕР±С‹ Р·Р°РіСЂСѓР·РёС‚СЊ РµС‰Рµ"}
        </p>
      )}
      <ScrollToTopButton anchorRef={feedColumnRef} />
    </div>
  );
}

